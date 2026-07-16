import { supabase } from "./supabaseClient"
import { getCurrentUserId } from "./auth"

// Keeps recipe photos quick to load. Matched server-side by the
// recipe-images bucket's file_size_limit in supabase/schema.sql — this is
// just the fast client-side check so a rejection doesn't wait on a network
// round-trip.
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

// Full-res mobile photos are far bigger than a recipe photo needs to be, so
// downscale and re-encode before upload rather than making people shrink
// their own images. GIFs are left alone so animation survives.
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82

export class ImageUploadError extends Error {}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  return file.type.split("/")[1] ?? "jpg"
}

async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    )
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.\w+$/, "") + ".jpg"
    return new File([blob], name, { type: "image/jpeg" })
  } catch {
    return file
  }
}

export async function uploadRecipeImage(file: File): Promise<string> {
  const userId = getCurrentUserId()
  if (!userId) throw new ImageUploadError("Must be signed in to upload an image")

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ImageUploadError("Please choose a JPEG, PNG, WebP, or GIF image.")
  }

  const compressed = await compressImage(file)
  if (compressed.size > MAX_IMAGE_SIZE_BYTES) {
    const limitMb = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0)
    throw new ImageUploadError(`Image is too large — please choose one under ${limitMb}MB.`)
  }

  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(compressed)}`
  const { error } = await supabase.storage.from("recipe-images").upload(path, compressed, {
    contentType: compressed.type,
    cacheControl: "3600",
  })
  if (error) throw new ImageUploadError(error.message)

  return supabase.storage.from("recipe-images").getPublicUrl(path).data.publicUrl
}
