import { supabase } from "./supabaseClient"
import { getCurrentUserId } from "./auth"

// Keeps recipe photos quick to load. Matched server-side by the
// recipe-images bucket's file_size_limit in supabase/schema.sql — this is
// just the fast client-side check so a rejection doesn't wait on a network
// round-trip.
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export class ImageUploadError extends Error {}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  return file.type.split("/")[1] ?? "jpg"
}

export async function uploadRecipeImage(file: File): Promise<string> {
  const userId = getCurrentUserId()
  if (!userId) throw new ImageUploadError("Must be signed in to upload an image")

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ImageUploadError("Please choose a JPEG, PNG, WebP, or GIF image.")
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const limitMb = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0)
    throw new ImageUploadError(`Image is too large — please choose one under ${limitMb}MB.`)
  }

  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`
  const { error } = await supabase.storage.from("recipe-images").upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
  })
  if (error) throw new ImageUploadError(error.message)

  return supabase.storage.from("recipe-images").getPublicUrl(path).data.publicUrl
}
