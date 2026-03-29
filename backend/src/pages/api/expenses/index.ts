// pages/api/expenses/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken, checkPermission } from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import prisma from '@/lib/prisma'
import { uploadImage } from '@/lib/s3'
import {
  sanitizeString,
  isValidString,
  isValidId,
  isOneOf,
  safeDate,
  safePositiveInt,
  validationError,
} from '@/lib/validate'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Now check authentication for actual requests
  const token = getTokenFromRequest(req as any)
  if (!token) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Permission check: viewPayroll
  const allowed = await checkPermission(decoded, 'viewPayroll')
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to access expenses' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetExpenses(req, res, decoded)
    case 'POST':
      return handleCreateExpense(req, res, decoded)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetExpenses(req: NextApiRequest, res: NextApiResponse, _decoded: any) {
  try {
    const { type, horseId, employeeId, startDate, endDate, page = 1, limit = 10 } = req.query

    console.log('📋 Expense filter params:', { type, horseId, employeeId, startDate, endDate, page, limit })

    let where: any = {}

    if (type) where.type = type
    if (horseId) where.horseId = horseId
    if (employeeId) where.employeeId = employeeId

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate as string)
      if (endDate) where.date.lte = new Date(endDate as string)
    }

    console.log('🔍 Where clause:', JSON.stringify(where, null, 2))

    const skip = (safePositiveInt(page, 1, 1000) - 1) * safePositiveInt(limit, 10, 100)

    const expenses = await prisma.expense.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
        horseId: true,
        employeeId: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        horse: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safePositiveInt(limit, 10, 100),
    })

    console.log('✅ Expenses found:', expenses.length)
    if (expenses.length > 0) {
      console.log('📋 Sample expense:', JSON.stringify(expenses[0], null, 2))
    }

    const total = await prisma.expense.count({ where })

    return res.status(200).json({
      expenses,
      total,
      pages: Math.ceil(total / safePositiveInt(limit, 10, 100)),
      currentPage: safePositiveInt(page, 1, 1000),
    })
  } catch (error) {
    console.error('❌ Error fetching expenses:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateExpense(req: NextApiRequest, res: NextApiResponse, decoded: any) {
  try {
    console.log('📝 Creating new expense...')
    const { type, amount, description, date, horseId, employeeId, attachments } = req.body
    console.log('📊 Received:', { type, amount, description, date, horseId, employeeId, attachmentCount: attachments?.length || 0 })

    // Validate required fields
    if (!type || !amount || !description || !date) {
      return validationError(res, 'Missing required fields: type, amount, description, date')
    }

    // Validate expense type against strict enum
    const validTypes = ['Medicine', 'Treatment', 'Maintenance', 'Miscellaneous'] as const
    if (!isOneOf(type, validTypes)) {
      return validationError(res, `Invalid expense type. Must be one of: ${validTypes.join(', ')}`)
    }

    // Validate description length
    if (!isValidString(description, 1, 1000)) {
      return validationError(res, 'Description must be 1-1000 characters')
    }

    // Ensure at least one of horseId or employeeId is provided
    if (!horseId && !employeeId) {
      return validationError(res, 'Either horseId or employeeId must be provided')
    }

    // Validate IDs if present
    if (horseId && horseId !== '' && !isValidId(horseId)) return validationError(res, 'Invalid horseId format')
    if (employeeId && employeeId !== '' && !isValidId(employeeId)) return validationError(res, 'Invalid employeeId format')

    // Validate amount
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100000000) {
      return validationError(res, 'Amount must be a positive number under 100,000,000')
    }

    // Validate date
    const parsedDate = safeDate(date)
    if (!parsedDate) return validationError(res, 'Invalid date format')

    // Limit attachments count
    if (attachments && Array.isArray(attachments) && attachments.length > 10) {
      return validationError(res, 'Maximum 10 attachments allowed')
    }

    console.log('✅ Basic validations passed')

    // Validate that horse exists if horseId provided
    if (horseId && horseId !== '') {
      const horse = await prisma.horse.findUnique({ where: { id: horseId } })
      if (!horse) {
        return res.status(400).json({ error: 'Horse not found' })
      }
    }

    // Validate that employee exists if employeeId provided
    if (employeeId && employeeId !== '') {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return res.status(400).json({ error: 'Employee not found' })
      }
    }

    // Process file attachments (base64 encoded)
    let uploadedUrls: string[] = []
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      console.log(`📎 Processing ${attachments.length} attachments...`)
      for (const attachment of attachments) {
        let base64String = null
        let mimeType = 'application/octet-stream'
        let filename = 'file'

        // Handle object format {name, type, size, data}
        if (typeof attachment === 'object' && attachment.data) {
          base64String = attachment.data
          mimeType = attachment.type || 'application/octet-stream'
          filename = attachment.name || 'file'
          console.log(`   [Object] File: ${filename} (${mimeType})`)
        } 
        // Handle string format (data URL)
        else if (typeof attachment === 'string' && attachment.startsWith('data:')) {
          console.log(`   [String] Data URL detected`)
          base64String = attachment
        }

        if (base64String) {
          try {
            // Extract base64 data and mime type
            let base64Data = base64String
            if (base64String.startsWith('data:')) {
              const matches = base64String.match(/^data:(.+?);base64,(.+)$/)
              if (matches) {
                mimeType = matches[1]
                base64Data = matches[2]
              }
            }

            // Validate mime type against allowlist (images + common receipt formats)
            const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
            if (!allowedMimes.includes(mimeType.toLowerCase())) {
              console.warn(`   ⚠️ Rejected attachment with disallowed type: ${mimeType}`)
              continue
            }

            const buffer = Buffer.from(base64Data, 'base64')

            // Reject files over 5MB each
            if (buffer.length > 5 * 1024 * 1024) {
              console.warn(`   ⚠️ Rejected attachment exceeding 5MB: ${buffer.length} bytes`)
              continue
            }
            
            // Generate filename from mime type if not already set
            if (filename === 'file') {
              const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin'
              filename = `file-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
            }
            
            console.log(`   📤 Uploading ${filename} (${buffer.length} bytes)...`)
            const url = await uploadImage(buffer, filename, mimeType, 'expenses')
            uploadedUrls.push(url)
            console.log(`   ✅ Uploaded: ${url}`)
          } catch (err) {
            console.error(`   ❌ Failed to process attachment:`, err)
          }
        } else if (typeof attachment === 'string') {
          // It's already a URL, keep it
          console.log(`   🔗 Existing URL: ${attachment}`)
          uploadedUrls.push(attachment)
        }
      }
    }

    const expense = await prisma.expense.create({
      data: {
        type,
        amount: parsedAmount,
        description: sanitizeString(description),
        date: parsedDate,
        createdById: decoded.id,
        horseId: horseId && horseId !== '' ? horseId : null,
        employeeId: employeeId && employeeId !== '' ? employeeId : null,
        attachments: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
        horseId: true,
        employeeId: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        horse: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true, email: true } },
      },
    })

    console.log('✅ Expense created:', JSON.stringify(expense, null, 2))

    return res.status(201).json(expense)
  } catch (error) {
    console.error('❌ Error creating expense:', error)
    console.error('   Error message:', (error as any).message)
    console.error('   Error stack:', (error as any).stack)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Increase request body size limit for file uploads (default is 1MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}