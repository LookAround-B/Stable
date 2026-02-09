// Local file upload utilities (fallback from S3)
import fs from 'fs'
import path from 'path'

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

export const uploadImage = async (
  buffer: Buffer,
  filename: string,
  mimetype: string,
  folderPath: string
): Promise<string> => {
  try {
    // Generate unique filename
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${filename}`
    const folderPath_ = path.join(uploadsDir, folderPath)
    
    // Ensure folder exists
    if (!fs.existsSync(folderPath_)) {
      fs.mkdirSync(folderPath_, { recursive: true })
    }
    
    const filePath = path.join(folderPath_, uniqueName)
    
    // Write file
    fs.writeFileSync(filePath, buffer)
    
    // Return public URL
    const publicUrl = `/uploads/${folderPath}/${uniqueName}`
    return publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    if (!imageUrl.startsWith('/uploads/')) {
      return // Skip non-local uploads
    }
    
    const filePath = path.join(process.cwd(), 'public', imageUrl)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (error) {
    console.error('Error deleting image:', error)
  }
}
