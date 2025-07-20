import { createClient } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export interface ImageUploadResult {
  url: string
  storagePath: string
  aspectRatio: number
}

export class ImageUploadService {
  private supabase = createClient()

  async uploadImage(file: File, projectId?: string): Promise<ImageUploadResult> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    if (file.size > maxSize) {
      throw new Error('Image size must be less than 50MB')
    }

    // Get image dimensions for aspect ratio calculation
    const dimensions = await this.getImageDimensions(file)
    const aspectRatio = dimensions.width / dimensions.height

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const storagePath = projectId ? `${projectId}/${fileName}` : fileName

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from('images')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    // Get signed URL for private bucket (expires in 1 hour)
    const { data: urlData, error: urlError } = await this.supabase.storage
      .from('images')
      .createSignedUrl(data.path, 3600) // 1 hour expiry

    if (urlError) {
      throw new Error(`Failed to create signed URL: ${urlError.message}`)
    }

    return {
      url: urlData.signedUrl,
      storagePath: data.path,
      aspectRatio
    }
  }

  async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('images')
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }

  /**
   * Migrates old public URLs to signed URLs for existing images
   * Handles URLs that contain the Supabase storage public URL pattern
   */
  async migratePublicUrlToSigned(url: string, expiresIn: number = 3600): Promise<string> {
    // Check if this is already a signed URL
    if (url.includes('sign=') || url.includes('token=')) {
      return url
    }

    // Extract storage path from public URL
    const publicUrlPattern = /\/storage\/v1\/object\/public\/images\/(.+)$/
    const match = url.match(publicUrlPattern)
    
    if (!match) {
      // Not a Supabase storage URL, return as is
      return url
    }

    const storagePath = match[1]
    return this.getSignedUrl(storagePath, expiresIn)
  }

  async deleteImage(storagePath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from('images')
      .remove([storagePath])

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`)
    }
  }

  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }

      img.src = url
    })
  }

  async compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)

        // Calculate new dimensions
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          file.type,
          quality
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image for compression'))
      }

      img.src = url
    })
  }
}

export const imageUploadService = new ImageUploadService()