import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge, tagCategoryColor } from "../ui/badge"
import { Separator } from "../ui/separator"
import { Icon } from "../ui/icon"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu"
import RecipeForm from "./RecipeForm"
import { cn } from "../../lib/utils"
import type { Recipe, TagCategory } from "../../lib/types"
import {
  getAllTags,
  getShoppingLists,
  createShoppingList,
  addRecipeToShoppingList,
  isCurrentUserAdmin,
} from "../../lib/storage"
import { useSession } from "../../lib/auth"

interface RecipeDetailProps {
  recipe: Recipe
  onUpdate: (updates: Partial<Recipe>) => void
  onDelete: () => void
  onBack: () => void
}

const TAG_CATEGORY_ORDER: TagCategory[] = ["meal", "cuisine", "protein", "effort", "diet", "custom"]

// Accepts a full URL ("https://example.com/..."), a protocol-relative URL
// ("//example.com/...", common in scraped JSON-LD), or a bare domain
// ("example.com/..." with no scheme at all).
function sourceUrl(source: string): string | null {
  const trimmed = source.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(trimmed)) return `https://${trimmed}`
  return null
}

export default function RecipeDetail({ recipe, onUpdate, onDelete, onBack }: RecipeDetailProps) {
  const navigate = useNavigate()
  const session = useSession()
  const isOwner = session?.user.id === recipe.userId || isCurrentUserAdmin()
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const existingTags = getAllTags()

  function handleAddToShoppingList(listId?: string) {
    const lists = getShoppingLists()
    if (lists.length === 0 || listId === "new") {
      const name = `Shopping list — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      const newList = createShoppingList(name, [recipe.id])
      navigate(`/shopping/${newList.id}`)
      return
    }
    const targetId = listId ?? lists[0].id
    const target = lists.find(l => l.id === targetId)
    if (target?.sourceRecipeIds.includes(recipe.id)) {
      toast.info("Already on your list")
      return
    }
    addRecipeToShoppingList(targetId, recipe.id)
    toast.success("Added to shopping list", {
      action: {
        label: "View",
        onClick: () => navigate(`/shopping/${targetId}`),
      },
    })
  }

  // Group tags by category
  const tagsByCategory: Partial<Record<TagCategory, string[]>> = {}
  for (const tag of recipe.tags) {
    if (!tagsByCategory[tag.category]) tagsByCategory[tag.category] = []
    tagsByCategory[tag.category]!.push(tag.value)
  }

  function handleSave(updates: Omit<Recipe, "id" | "userId" | "createdAt" | "updatedAt">) {
    onUpdate(updates)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Edit Recipe</h1>
          <p className="text-muted-foreground text-sm">{recipe.title}</p>
        </div>
        <RecipeForm
          initialData={recipe}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          existingTags={existingTags}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back + actions row */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1 px-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
        >
          <Icon name="chevron_left" />
          Back to recipes
        </Button>
        <div className="flex gap-2">
          {session && (() => {
            const lists = getShoppingLists()
            if (lists.length <= 1) {
              return (
                <Button variant="outline" size="sm" onClick={() => handleAddToShoppingList()} className="gap-1.5">
                  <Icon name="shopping_cart" />
                  Add to list
                </Button>
              )
            }
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Icon name="shopping_cart" />
                    Add to list
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {lists.map(l => (
                    <DropdownMenuItem key={l.id} onClick={() => handleAddToShoppingList(l.id)}>
                      {l.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleAddToShoppingList("new")}>
                    New list
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          })()}
          {isOwner && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Hero image */}
      {recipe.imageUrl && !imageError && (
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="w-full aspect-[16/9] object-cover rounded-lg mb-6"
          onError={() => setImageError(true)}
        />
      )}

      {/* Header */}
      <h1 className="text-3xl font-bold mb-2">{recipe.title}</h1>
      {recipe.source && (
        <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
          <Icon name="open_in_new" size="sm" />
          {sourceUrl(recipe.source) ? (
            <a
              href={sourceUrl(recipe.source)!}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground hover:underline"
            >
              {recipe.source}
            </a>
          ) : (
            recipe.source
          )}
        </p>
      )}

      {/* Meta row */}
      {(recipe.prepTime || recipe.cookTime || recipe.servings) && (
        <div className="flex flex-wrap gap-6 mb-6 text-sm text-muted-foreground">
          {recipe.prepTime && (
            <span className="flex items-center gap-1.5">
              <Icon name="schedule" />
              <span>Prep: <strong className="text-foreground">{recipe.prepTime}</strong></span>
            </span>
          )}
          {recipe.cookTime && (
            <span className="flex items-center gap-1.5">
              <Icon name="schedule" />
              <span>Cook: <strong className="text-foreground">{recipe.cookTime}</strong></span>
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1.5">
              <Icon name="group" />
              <span>Serves: <strong className="text-foreground">{recipe.servings}</strong></span>
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {TAG_CATEGORY_ORDER.filter(cat => tagsByCategory[cat]?.length).flatMap(cat =>
            tagsByCategory[cat]!.map(value => (
              <Badge
                key={`${cat}-${value}`}
                variant="outline"
                className={cn("text-xs", tagCategoryColor(cat))}
              >
                {value}
              </Badge>
            ))
          )}
        </div>
      )}

      <Separator className="mb-6" />

      {/* Ingredients & Steps */}
      {(recipe.ingredients.length > 0 || recipe.steps.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-x-10 gap-y-6 mb-6">
          {recipe.ingredients.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Ingredients</h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => {
                  const qty = [ing.quantity, ing.unit].filter(Boolean).join(" ")
                  return (
                    <li key={i} className="text-sm">
                      {qty && <span className="font-medium text-muted-foreground">{qty} </span>}
                      {ing.item}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {recipe.steps.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Steps</h2>
              <ol className="space-y-4">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed pt-0.5">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      {/* Notes */}
      {recipe.notes && (
        <>
          <Separator className="mb-6" />
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Notes</h2>
            <div className="rounded-lg bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              {recipe.notes}
            </div>
          </section>
        </>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{recipe.title}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteOpen(false)
                onDelete()
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
