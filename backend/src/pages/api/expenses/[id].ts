// pages/api/expenses/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { uploadImage } from '@/lib/s3'
import Busboy from 'busboy'
import { setCorsHeaders } from '@/lib/cors'
import { isValidId, isValidString, sanitizeString, isAllowedMime } from '@/lib/validate'

const ALLOWED_UPLOAD_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

  if (!id || typeof id !== 'string' || !isValidId(id)) {
    return res.status(400).json({ error: 'Invalid expense ID' })
  }

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

async function handleGetExpense(_req: NextApiRequest, res: NextApiResponse, _decoded: any, id: string) {
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

async function handleUpdateExpense(req: NextApiRequest, res: NextApiResponse, _decoded: any, id: string) {
  try {
    // Check if expense exists
    const expense = await prisma.expense.findUnique({ where: { id } })
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    let formData: any = {}
    let uploadedFiles: string[] = []

    // Check if request is FormData or JSON
    const contentType = req.headers['content-type'] || ''

    if (contentType.includes('multipart/form-data')) {
      // Parse FormData with files
      const bb = Busboy({ headers: req.headers })
      let filePromises: Promise<any>[] = []

      bb.on('field', (fieldname: string, val: string) => {
        formData[fieldname] = val
      })

      bb.on('file', (_fieldname: string, file: any, info: any) => {
        // Validate mime type
        if (!isAllowedMime(info.mimeType, ALLOWED_UPLOAD_MIMES)) {
          file.resume() // drain the stream
          return
        }
        const filePromise = new Promise((resolve, reject) => {
          try {
            const chunks: Buffer[] = []
            file.on('data', (data: Buffer) => chunks.push(data))
            file.on('end', async () => {
              try {
                const buffer = Buffer.concat(chunks)
                const url = await uploadImage(buffer, info.filename, info.mimeType, 'expenses')
                uploadedFiles.push(url)
                resolve(url)
              } catch (err) {
                reject(err)
              }
            })
            file.on('error', reject)
          } catch (err) {
            reject(err)
          }
        })
        filePromises.push(filePromise)
      })

      await new Promise((resolve, reject) => {
        bb.on('close', () => resolve(null))
        bb.on('error', reject)
        req.pipe(bb)
      })

      // Wait for all file uploads to complete
      await Promise.all(filePromises)
    } else {
      // Handle JSON request
      formData = req.body
    }

    const { type, amount, description, date, horseId, employeeId, existingAttachments } = formData

    const updateData: any = {}
    if (type) {
      if (!isValidString(type, 1, 100)) return res.status(400).json({ error: 'Type must be max 100 chars' })
      updateData.type = sanitizeString(type)
    }
    if (amount) {
      const parsed = parseFloat(amount)
      if (isNaN(parsed) || parsed < 0 || parsed > 100000000) return res.status(400).json({ error: 'Invalid amount' })
      updateData.amount = parsed
    }
    if (description) {
      if (!isValidString(description, 0, 1000)) return res.status(400).json({ error: 'Description max 1000 chars' })
      updateData.description = sanitizeString(description)
    }
    if (date) updateData.date = new Date(date)
    if (horseId !== undefined) {
      if (horseId && horseId !== '' && !isValidId(horseId)) return res.status(400).json({ error: 'Invalid horseId' })
      updateData.horseId = horseId && horseId !== '' ? horseId : null
    }
    if (employeeId !== undefined) {
      if (employeeId && employeeId !== '' && !isValidId(employeeId)) return res.status(400).json({ error: 'Invalid employeeId' })
      updateData.employeeId = employeeId && employeeId !== '' ? employeeId : null
    }

    // Handle attachments - combine existing and newly uploaded
    let allAttachments: string[] = []
    if (existingAttachments) {
      try {
        allAttachments = JSON.parse(existingAttachments)
      } catch (e) {
        allAttachments = []
      }
    }
    allAttachments = [...allAttachments, ...uploadedFiles]

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

    return res.status(200).json(updatedExpense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleDeleteExpense(_req: NextApiRequest, res: NextApiResponse, _decoded: any, id: string) {
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
