import { useState, useRef } from "react"
import { Icon } from "../ui/icon"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import IngredientInput from "./IngredientInput"
import StepInput from "./StepInput"
import TagInput from "./TagInput"
import { importRecipeFromUrl } from "../../lib/import"
import { toTitleCase } from "../../lib/utils"
import { uploadRecipeImage, ImageUploadError, MAX_IMAGE_SIZE_BYTES } from "../../lib/imageUpload"
import type { Recipe, Ingredient, Tag } from "../../lib/types"

interface RecipeFormProps {
  initialData?: Partial<Recipe>
  onSave: (recipe: Omit<Recipe, "id" | "userId" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
  existingTags?: Record<string, string[]>
}

interface FormErrors {
  title?: string
  ingredients?: string
  mealType?: string
}

export default function RecipeForm({ initialData, onSave, onCancel, existingTags = {} }: RecipeFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "")
  const [source, setSource] = useState(initialData?.source ?? "")
  const [prepTime, setPrepTime] = useState(initialData?.prepTime ?? "")
  const [cookTime, setCookTime] = useState(initialData?.cookTime ?? "")
  const [servings, setServings] = useState<string>(initialData?.servings?.toString() ?? "")
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? "")
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients?.length ? initialData.ingredients : [{ item: "", quantity: "", unit: "" }]
  )
  const [steps, setSteps] = useState<string[]>(
    initialData?.steps?.length ? initialData.steps : [""]
  )
  const [tags, setTags] = useState<Tag[]>(initialData?.tags ?? [])
  const [notes, setNotes] = useState(initialData?.notes ?? "")
  const [errors, setErrors] = useState<FormErrors>({})
  const [urlInput, setUrlInput] = useState("")
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImport() {
    const url = urlInput.trim()
    if (!url) return
    setImporting(true)
    setImportError(null)
    try {
      const data = await importRecipeFromUrl(url)
      if (data.title) setTitle(data.title)
      if (data.source) setSource(data.source)
      if (data.prepTime) setPrepTime(data.prepTime)
      if (data.cookTime) setCookTime(data.cookTime)
      if (data.servings) setServings(String(data.servings))
      if (data.imageUrl) setImageUrl(data.imageUrl)
      if (data.ingredients?.length) setIngredients(data.ingredients)
      if (data.steps?.length) setSteps(data.steps)
      if (data.tags?.length) setTags(data.tags.map(t => ({ ...t, value: toTitleCase(t.value) })))
      if (data.notes) setNotes(data.notes)
      setUrlInput("")
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.")
    } finally {
      setImporting(false)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const url = await uploadRecipeImage(file)
      setImageUrl(url)
      setPreviewError(false)
    } catch (err) {
      setUploadError(err instanceof ImageUploadError ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}
    if (!title.trim()) {
      newErrors.title = "Title is required."
    }
    if (!ingredients.some(i => i.item.trim())) {
      newErrors.ingredients = "At least one ingredient is required."
    }
    if (!tags.some(t => t.category === "meal")) {
      newErrors.mealType = "Add at least one meal type."
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    onSave({
      title: title.trim(),
      source: source.trim() || undefined,
      prepTime: prepTime.trim() || undefined,
      cookTime: cookTime.trim() || undefined,
      servings: servings ? parseInt(servings, 10) : undefined,
      imageUrl: imageUrl.trim() || undefined,
      ingredients: ingredients.filter(i => i.item.trim()),
      steps: steps.filter(s => s.trim()),
      tags,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* URL import */}
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Icon name="link" size="sm" className="text-primary" />
          Import from URL
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Paste a recipe URL…"
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setImportError(null) }}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleImport())}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleImport}
            disabled={importing || !urlInput.trim()}
            className="shrink-0"
          >
            {importing ? "Importing…" : "Import"}
          </Button>
        </div>
        {importError && <p className="text-sm text-destructive">{importError}</p>}
      </div>

      <Separator />

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Recipe title"
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>

      {/* Source */}
      <div className="space-y-1.5">
        <Label htmlFor="source">Source</Label>
        <Input
          id="source"
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder="Book, website, or person"
        />
      </div>

      {/* Image */}
      <div className="space-y-1.5">
        <Label htmlFor="imageUrl">Image</Label>
        <div className="flex gap-2">
          <Input
            id="imageUrl"
            value={imageUrl}
            onChange={e => { setImageUrl(e.target.value); setPreviewError(false) }}
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
          Paste a URL, or upload a JPEG/PNG/WebP/GIF up to {(MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.
        </p>
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        {imageUrl && !previewError && (
          <img
            key={imageUrl}
            src={imageUrl}
            alt=""
            className="mt-2 h-32 w-auto max-w-xs rounded-md border object-cover"
            onError={() => setPreviewError(true)}
          />
        )}
      </div>

      {/* Time & Servings */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="prepTime">Prep Time</Label>
          <Input
            id="prepTime"
            value={prepTime}
            onChange={e => setPrepTime(e.target.value)}
            placeholder="e.g. 15 min"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cookTime">Cook Time</Label>
          <Input
            id="cookTime"
            value={cookTime}
            onChange={e => setCookTime(e.target.value)}
            placeholder="e.g. 30 min"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="servings">Servings</Label>
          <Input
            id="servings"
            type="number"
            min={1}
            value={servings}
            onChange={e => setServings(e.target.value)}
            placeholder="e.g. 4"
          />
        </div>
      </div>

      <Separator />

      {/* Ingredients */}
      <div className="space-y-2">
        <Label>
          Ingredients <span className="text-destructive">*</span>
        </Label>
        <IngredientInput ingredients={ingredients} onChange={setIngredients} />
        {errors.ingredients && <p className="text-sm text-destructive">{errors.ingredients}</p>}
      </div>

      <Separator />

      {/* Steps */}
      <div className="space-y-2">
        <Label>Steps</Label>
        <StepInput steps={steps} onChange={setSteps} />
      </div>

      <Separator />

      {/* Tags */}
      <div className="space-y-2">
        <Label>
          Tags <span className="text-muted-foreground font-normal text-xs">(Meal type required)</span>
        </Label>
        <TagInput tags={tags} onChange={t => { setTags(t); setErrors(e => ({ ...e, mealType: undefined })) }} existingTags={existingTags} />
        {errors.mealType && <p className="text-sm text-destructive">{errors.mealType}</p>}
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional notes, tips, or variations..."
          className="min-h-[100px]"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Recipe</Button>
      </div>
    </form>
  )
}
