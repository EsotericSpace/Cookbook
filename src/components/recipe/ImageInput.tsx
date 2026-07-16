import { useRef, useState } from "react"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { uploadRecipeImage, ImageUploadError } from "../../lib/imageUpload"

interface ImageInputProps {
  value: string
  onChange: (url: string) => void
  label?: string
}

export default function ImageInput({ value, onChange, label }: ImageInputProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const url = await uploadRecipeImage(file)
      onChange(url)
      setPreviewError(false)
    } catch (err) {
      setUploadError(err instanceof ImageUploadError ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => { onChange(e.target.value); setPreviewError(false) }}
          placeholder="https://…"
          className="flex-1"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0"
        >
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a URL, or upload a JPEG/PNG/WebP/GIF file.
      </p>
      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
      {value && !previewError && (
        <img
          key={value}
          src={value}
          alt=""
          className="mt-2 h-32 w-auto max-w-xs rounded-md border object-cover"
          onError={() => setPreviewError(true)}
        />
      )}
    </div>
  )
}
