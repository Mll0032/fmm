import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://pszljowgygaxfpjeqoue.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzemxqb3dneWdheGZwamVxb3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Njg4NTQsImV4cCI6MjA5NDU0NDg1NH0.Fj8osSQT4UKwrCxIPuQeQoMzMPTpGRvTQLxoov_wm3I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to upload images to Supabase Storage
export async function uploadImage(file, path) {
  try {
    const { error } = await supabase.storage
      .from('module-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
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

// ── Audio Storage ────────────────────────────────────────────────────────────

export async function uploadAudio(file, path) {
  try {
    const { error } = await supabase.storage
      .from('module-audio')
      .upload(path, file, { cacheControl: '3600', upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('module-audio').getPublicUrl(path)
    return { success: true, url: data.publicUrl }
  } catch (error) {
    console.error('Error uploading audio:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteAudioFile(storagePath) {
  const { error } = await supabase.storage.from('module-audio').remove([storagePath])
  if (error) console.error('Error deleting audio file:', error)
}

// ── Soundboard Config ─────────────────────────────────────────────────────────

export async function getSoundboard(moduleId) {
  const { data, error } = await supabase
    .from('soundboards')
    .select('bites')
    .eq('module_id', moduleId)
    .single()
  if (error) return []
  return data?.bites || []
}

export async function saveSoundboard(moduleId, bites) {
  const { error } = await supabase
    .from('soundboards')
    .upsert(
      { module_id: moduleId, bites, updated_at: new Date().toISOString() },
      { onConflict: 'module_id' }
    )
  if (error) console.error('Error saving soundboard:', error)
}

// ── Library ───────────────────────────────────────────────────────────────────

export async function publishToLibrary(module, ownerName, system = '') {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('library')
    .insert([{
      owner_id: user.id,
      owner_name: ownerName,
      module_name: module.name,
      module_category: module.category,
      module_data: module.data,
      system: system.trim(),
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLibraryEntries() {
  const { data, error } = await supabase
    .from('library')
    .select('*')
    .order('published_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function removeFromLibrary(libraryId) {
  const { error } = await supabase
    .from('library')
    .delete()
    .eq('id', libraryId);
  if (error) throw error;
}

// ── Image helpers ─────────────────────────────────────────────────────────────

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