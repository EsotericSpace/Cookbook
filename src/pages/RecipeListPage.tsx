import { useState, useSyncExternalStore } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import FilterSidebar from "../components/layout/FilterSidebar"
import RecipeCard from "../components/recipe/RecipeCard"
import { Button } from "../components/ui/button"
import { Checkbox } from "../components/ui/checkbox"
import { Icon } from "../components/ui/icon"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { getRecipes, getAllTags, createShoppingList, subscribe, getVersion } from "../lib/storage"
import { useSession } from "../lib/auth"
import { applySearchAndFilter } from "../lib/search"
import type { Recipe, ActiveFilters } from "../lib/types"

const SORT_OPTIONS = [
  { value: "title-asc", label: "Title (A–Z)" },
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
]

function parseFilters(param: string | null): ActiveFilters {
  if (!param) return {}
  const result: ActiveFilters = {}
  for (const part of param.split(",")) {
    const colonIdx = part.indexOf(":")
    if (colonIdx === -1) continue
    const category = part.slice(0, colonIdx)
    const value = part.slice(colonIdx + 1)
    if (!category || !value) continue
    if (!result[category]) result[category] = []
    result[category].push(value)
  }
  return result
}

function encodeFilters(filters: ActiveFilters): string {
  const parts: string[] = []
  for (const [cat, vals] of Object.entries(filters)) {
    for (const val of vals) {
      parts.push(`${cat}:${val}`)
    }
  }
  return parts.join(",")
}

function sortRecipes(recipes: Recipe[], sort: string): Recipe[] {
  const sorted = [...recipes]
  switch (sort) {
    case "date-desc":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case "date-asc":
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    case "title-asc":
    default:
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
  }
}

function computeTagCounts(recipes: Recipe[]): Record<string, Record<string, number>> {
  const counts: Record<string, Record<string, number>> = {}
  for (const recipe of recipes) {
    for (const tag of recipe.tags) {
      if (!counts[tag.category]) counts[tag.category] = {}
      counts[tag.category][tag.value] = (counts[tag.category][tag.value] ?? 0) + 1
    }
  }
  return counts
}

export default function RecipeListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const recipes = useSyncExternalStore(subscribe, getRecipes)
  const allTags = useSyncExternalStore(subscribe, getAllTags)
  useSyncExternalStore(subscribe, getVersion) // re-render on any storage change, not just recipes/tags
  const session = useSession()
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const query = searchParams.get("q") ?? ""
  const sort = searchParams.get("sort") ?? "title-asc"
  const activeFilters = parseFilters(searchParams.get("filters"))

  function handleFilterChange(category: string, value: string, checked: boolean) {
    const current = activeFilters[category] ?? []
    const next = checked
      ? [...current, value]
      : current.filter(v => v !== value)
    const newFilters = { ...activeFilters, [category]: next }
    const params = new URLSearchParams(searchParams)
    const encoded = encodeFilters(newFilters)
    if (encoded) {
      params.set("filters", encoded)
    } else {
      params.delete("filters")
    }
    setSearchParams(params, { replace: true })
  }

  function handleClearAll() {
    const params = new URLSearchParams(searchParams)
    params.delete("filters")
    setSearchParams(params, { replace: true })
  }

  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams)
    params.set("sort", value)
    setSearchParams(params, { replace: true })
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCreateShoppingList() {
    const name = `Shopping list — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    const newList = createShoppingList(name, [...selectedIds])
    navigate(`/shopping/${newList.id}`)
  }

  const filtered = applySearchAndFilter(recipes, query, activeFilters)
  const displayed = sortRecipes(filtered, sort)
  const tagCounts = computeTagCounts(recipes)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <FilterSidebar
          allTags={allTags}
          tagCounts={tagCounts}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAll}
        />
        <div className="flex items-center gap-2 shrink-0">
          {recipes.length > 0 && (
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {recipes.length > 0 && session && (
            <>
              {selectMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    disabled={selectedIds.size === 0}
                    onClick={handleCreateShoppingList}
                  >
                    Create shopping list
                    {selectedIds.size > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary-foreground/20 px-1.5 text-xs font-medium">
                        {selectedIds.size}
                      </span>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setSelectMode(true)}
                >
                  Create Shopping List
                </Button>
              )}
              <Button size="sm" className="shrink-0" onClick={() => navigate("/add")}>
                Add Recipe
              </Button>
            </>
          )}
        </div>
      </div>

      <div>
        {recipes.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {displayed.length} {displayed.length === 1 ? "recipe" : "recipes"}
          </p>
        )}

        {/* Empty state */}
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Icon name="soup_kitchen" size="xl" className="text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No recipes yet</h2>
            {session ? (
              <>
                <p className="text-muted-foreground mb-6">Add your first recipe to get started!</p>
                <Button onClick={() => navigate("/add")}>
                  <Icon name="add" className="mr-2" />
                  Add Recipe
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Sign in to add the first recipe.</p>
            )}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground">No recipes match your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map(recipe => (
              <div key={recipe.id} className="relative">
                {selectMode && (
                  <div
                    className="absolute top-2 right-2 z-10"
                    onClick={e => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.has(recipe.id)}
                      onCheckedChange={() => toggleSelect(recipe.id)}
                      className="bg-background shadow"
                    />
                  </div>
                )}
                <RecipeCard
                  recipe={recipe}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  disabled={selectMode}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
