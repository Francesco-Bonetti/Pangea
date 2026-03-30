import { createClient } from "./supabase"

export const BUCKETS = {
  AVATARS: "avatars",
  PROPOSALS: "proposals",
  PUBLIC: "public",
} as const

export async function uploadFile(bucket: string, path: string, file: File, options?: { upsert?: boolean }): Promise<string> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: options?.upsert ?? false,
    contentType: file.type,
  })
  if (error) throw error
  return getPublicUrl(bucket, path)
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()
  return uploadFile(BUCKETS.AVATARS, `${userId}/avatar.${ext}`, file, { upsert: true })
}

export async function uploadProposalAttachment(proposalId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  return uploadFile(BUCKETS.PROPOSALS, `${proposalId}/${Date.now()}-${safeName}`, file)
}

export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
