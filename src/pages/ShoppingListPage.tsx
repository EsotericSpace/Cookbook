import { useState, useEffect, useRef, useSyncExternalStore } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Icon } from "../components/ui/icon"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Separator } from "../components/ui/separator"
import { cn } from "../lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover"
import AisleGroup from "../components/shopping/AisleGroup"
import AddItemInput from "../components/shopping/AddItemInput"
import RecipeChip from "../components/shopping/RecipeChip"
import {
  getShoppingLists,
  getRecipes,
  addRecipeToShoppingList,
  removeRecipeFromShoppingList,
  updateShoppingListItems,
  addFreeformItem,
  deleteShoppingList,
  updateShoppingListName,
  subscribe,
  getVersion,
} from "../lib/storage"
import { searchRecipes } from "../lib/search"
import { formatShoppingListText, slugifyFileName, downloadTextFile, emailShoppingList } from "../lib/shopping-export"
import type { ShoppingListItem } from "../lib/types"

const AISLE_ORDER = [
  "produce", "dairy & eggs", "meat & seafood", "pantry", "canned & jarred", "bread & bakery", "other",
]

export default function ShoppingListPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const lists = useSyncExternalStore(subscribe, getShoppingLists)
  const allRecipes = useSyncExternalStore(subscribe, getRecipes)
  useSyncExternalStore(subscribe, getVersion)
  const list = lists.find(l => l.id === id) ?? null

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(list?.name ?? "")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [recipeSearch, setRecipeSearch] = useState("")
  const [addRecipeOpen, setAddRecipeOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [draftItems, setDraftItems] = useState<ShoppingListItem[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) {
      setTimeout(() => nameInputRef.current?.focus(), 0)
    }
  }, [editingName])

  if (list === null) {
    navigate("/", { replace: true })
    return null
  }

  const sourceRecipes = allRecipes.filter(r => list.sourceRecipeIds.includes(r.id))

  const filteredRecipes = recipeSearch.trim()
    ? searchRecipes(allRecipes, recipeSearch)
    : allRecipes

  const availableRecipes = filteredRecipes.filter(r => !list.sourceRecipeIds.includes(r.id))

  function handleSaveName() {
    if (!id) return
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== list!.name) {
      updateShoppingListName(id, trimmed)
    }
    setEditingName(false)
  }

  function handleRemoveRecipe(recipeId: string) {
    if (!id) return
    removeRecipeFromShoppingList(id, recipeId)
  }

  function handleAddRecipe(recipeId: string) {
    if (!id) return
    addRecipeToShoppingList(id, recipeId)
    setAddRecipeOpen(false)
    setRecipeSearch("")
  }

  function handleAddItem(name: string) {
    if (!id) return
    addFreeformItem(id, name)
  }

  function handleEnterEditMode() {
    setDraftItems(list!.items.map(item => ({ ...item })))
    setHasChanges(false)
    setEditMode(true)
  }

  function handleCancelEditMode() {
    setEditMode(false)
    setDraftItems([])
    setHasChanges(false)
  }

  function handleDraftItemChange(itemId: string, updates: Partial<ShoppingListItem>) {
    setDraftItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item))
    setHasChanges(true)
  }

  function handleDraftItemDelete(itemId: string) {
    setDraftItems(prev => prev.filter(item => item.id !== itemId))
    setHasChanges(true)
  }

  function handleSaveEditMode() {
    if (!id) return
    updateShoppingListItems(id, draftItems)
    setEditMode(false)
    setDraftItems([])
    setHasChanges(false)
    toast.success("Shopping list updated")
  }

  function handleDelete() {
    if (!id) return
    deleteShoppingList(id)
    navigate("/")
  }

  function handleExport() {
    const text = formatShoppingListText(list!, aisleGroups)
    downloadTextFile(`${slugifyFileName(list!.name)}.txt`, text)
  }

  async function handleEmail() {
    const text = formatShoppingListText(list!, aisleGroups)
    const result = await emailShoppingList(list!, text)
    if (result === "clipboard-fallback") {
      toast.info("List copied to clipboard — paste it into the email", {
        description: "It was too long to include automatically.",
      })
    }
  }

  const displayedItems = editMode ? draftItems : list.items

  const aisleGroups = AISLE_ORDER.map(aisle => ({
    aisle,
    items: displayedItems.filter(i => i.aisle === aisle),
  })).filter(g => g.items.length > 0)

  const otherAisles = displayedItems
    .map(i => i.aisle)
    .filter(a => !AISLE_ORDER.includes(a))
  const uniqueOtherAisles = [...new Set(otherAisles)]
  for (const aisle of uniqueOtherAisles) {
    if (!AISLE_ORDER.includes(aisle)) {
      aisleGroups.push({ aisle, items: displayedItems.filter(i => i.aisle === aisle) })
    }
  }

  const itemCount = displayedItems.length

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="px-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
          disabled={editMode}
        >
          <Icon name="chevron_left" />
          Back to recipes
        </Button>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          {editingName ? (
            <Input
              ref={nameInputRef}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={e => {
                if (e.key === "Enter") handleSaveName()
                if (e.key === "Escape") { setEditingName(false); setNameValue(list.name) }
              }}
              className="text-2xl font-bold h-auto py-1 px-2 border-primary"
            />
          ) : (
            <h1
              className={cn(
                "text-2xl font-bold transition-colors",
                !editMode && "cursor-pointer hover:text-primary"
              )}
              onClick={() => { if (!editMode) { setNameValue(list.name); setEditingName(true) } }}
              title={editMode ? undefined : "Click to rename"}
            >
              {list.name}
            </h1>
          )}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {editMode && (
              <Button size="sm" disabled={!hasChanges} onClick={handleSaveEditMode}>
                Save
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={editMode ? handleCancelEditMode : handleEnterEditMode}
            >
              {editMode ? "Cancel" : "Edit"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </p>
      </div>

      {(sourceRecipes.length > 0 || true) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {sourceRecipes.map(recipe => (
            <RecipeChip
              key={recipe.id}
              recipe={recipe}
              onRemove={() => handleRemoveRecipe(recipe.id)}
              disabled={editMode}
            />
          ))}
          <Popover open={addRecipeOpen} onOpenChange={setAddRecipeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full h-8" disabled={editMode}>
                <Icon name="add" size="sm" />
                Add recipe
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <div className="relative mb-2">
                <Icon name="search" size="sm" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Search recipes..."
                  value={recipeSearch}
                  onChange={e => setRecipeSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {availableRecipes.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                    {recipeSearch ? "No recipes found" : "All recipes added"}
                  </p>
                ) : (
                  availableRecipes.map(recipe => (
                    <button
                      key={recipe.id}
                      type="button"
                      className="w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent transition-colors"
                      onClick={() => handleAddRecipe(recipe.id)}
                    >
                      {recipe.title}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Separator className="mb-4" />

      <div className="space-y-1 mb-6">
        {aisleGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No items yet. Add some below.</p>
        ) : (
          aisleGroups.map(({ aisle, items }) => (
            <AisleGroup
              key={aisle}
              aisle={aisle}
              items={items}
              editable={editMode}
              onItemChange={handleDraftItemChange}
              onItemDelete={handleDraftItemDelete}
            />
          ))
        )}
      </div>

      <Separator className="mb-4" />

      <div className="mb-8">
        <AddItemInput onAdd={handleAddItem} disabled={editMode} />
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={editMode}>
            <Icon name="download" size="sm" />
            Export .txt
          </Button>
          <Button variant="outline" size="sm" onClick={handleEmail} disabled={editMode}>
            <Icon name="mail" size="sm" />
            Email
          </Button>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} disabled={editMode}>
          Delete list
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Shopping List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{list.name}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
