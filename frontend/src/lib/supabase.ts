import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null = modo demonstração (sem Supabase). */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export async function enviarFoto(arquivo: File, userId: string): Promise<string> {
  if (!supabase) throw new Error('Upload de fotos precisa do Supabase configurado')
  if (arquivo.size > 5 * 1024 * 1024) throw new Error('A foto deve ter no máximo 5 MB')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
    throw new Error('Use uma foto JPG, PNG ou WebP')
  }
  const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const caminho = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('fotos').upload(caminho, arquivo, { upsert: false })
  if (error) throw new Error(error.message)
  return supabase.storage.from('fotos').getPublicUrl(caminho).data.publicUrl
}
