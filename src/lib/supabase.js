import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://brcnpujuzadxcfgpjupu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY25wdWp1emFkeGNmZ3BqdXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMTY5MjEsImV4cCI6MjA3MDc5MjkyMX0.Q8u6B3nTDZLbW8G0GTBYxy2Lupv_iSXvyUikD55V3-A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to upload images to Supabase Storage
export async function uploadImage(file, path) {
  try {
    const { error } = await supabase.storage
      .from('module-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('module-images')
      .getPublicUrl(path)

    return {
      success: true,
      url: urlData.publicUrl,
      path: path
    }
  } catch (error) {
    console.error('Error uploading image:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Helper function to delete images from Supabase Storage
export async function deleteImage(path) {
  try {
    const { error } = await supabase.storage
      .from('module-images')
      .remove([path])

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting image:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Helper function to convert base64 dataURL to File object
export function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  
  return new File([u8arr], filename, { type: mime })
}