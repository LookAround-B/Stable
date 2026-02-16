// pages/api/expenses/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { runMiddleware } from '@/lib/cors'
import { uploadImage } from '@/lib/s3'
import cors from 'cors'

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers explicitly
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  // Run CORS middleware
  await runMiddleware(req, res, corsMiddleware)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Check authentication
  const token = getTokenFromRequest(req as any)
  if (!token) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const { id } = req.query

  switch (req.method) {
    case 'GET':
      return handleGetExpense(req, res, decoded, id as string)
    case 'PUT':
      return handleUpdateExpense(req, res, decoded, id as string)
    case 'DELETE':
      return handleDeleteExpense(req, res, decoded, id as string)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetExpense(req: NextApiRequest, res: NextApiResponse, decoded: any, id: string) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id },
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

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    return res.status(200).json(expense)
  } catch (error) {
    console.error('Error fetching expense:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleUpdateExpense(req: NextApiRequest, res: NextApiResponse, decoded: any, id: string) {
  try {
    console.log('📝 Updating expense:', id)
    // Check if expense exists
    const expense = await prisma.expense.findUnique({ where: { id } })
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    const { type, amount, description, date, horseId, employeeId, attachments } = req.body
    console.log('📊 Received:', { type, amount, description, date, horseId, employeeId, attachmentCount: attachments?.length || 0 })

    const updateData: any = {}
    if (type) updateData.type = type
    if (amount) updateData.amount = parseFloat(amount)
    if (description) updateData.description = description
    if (date) updateData.date = new Date(date)
    if (horseId !== undefined) updateData.horseId = horseId && horseId !== '' ? horseId : null
    if (employeeId !== undefined) updateData.employeeId = employeeId && employeeId !== '' ? employeeId : null

    // Handle attachments - process base64 and existing URLs
    let allAttachments: string[] = []
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
        // Handle string format (data URL or existing URL)
        else if (typeof attachment === 'string' && attachment.startsWith('data:')) {
          console.log(`   [String] Data URL detected`)
          base64String = attachment
        } else if (typeof attachment === 'string') {
          // It's already a URL, keep it
          console.log(`   🔗 Existing URL: ${attachment}`)
          allAttachments.push(attachment)
          continue
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

            const buffer = Buffer.from(base64Data, 'base64')
            
            // Generate filename from mime type if not already set
            if (filename === 'file') {
              const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin'
              filename = `file-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
            }
            
            console.log(`   📤 Uploading ${filename} (${buffer.length} bytes)...`)
            const url = await uploadImage(buffer, filename, mimeType, 'expenses')
            allAttachments.push(url)
            console.log(`   ✅ Uploaded: ${url}`)
          } catch (err) {
            console.error(`   ❌ Failed to process attachment:`, err)
          }
        }
      }
    }

    if (allAttachments.length > 0) {
      updateData.attachments = JSON.stringify(allAttachments)
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: updateData,
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

    console.log('✅ Expense updated')
    return res.status(200).json(updatedExpense)
  } catch (error) {
    console.error('❌ Error updating expense:', error)
    return res.status(500).json({ error: 'Internal server error', details: (error as any).message })
  }
}

async function handleDeleteExpense(req: NextApiRequest, res: NextApiResponse, decoded: any, id: string) {
  try {
    const expense = await prisma.expense.findUnique({ where: { id } })
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    await prisma.expense.delete({ where: { id } })

    return res.status(200).json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
