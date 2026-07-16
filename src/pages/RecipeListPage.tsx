import { useSyncExternalStore } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import FilterSidebar from "../components/layout/FilterSidebar"
import RecipeCard from "../components/recipe/RecipeCard"
import { Button } from "../components/ui/button"
import { Icon } from "../components/ui/icon"
import { getRecipes, getAllTags, subscribe, getVersion } from "../lib/storage"
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

  const filtered = applySearchAndFilter(recipes, query, activeFilters)
  const displayed = sortRecipes(filtered, sort)
  const tagCounts = computeTagCounts(recipes)

  return (
    <div className="space-y-4">
      <FilterSidebar
        allTags={allTags}
        tagCounts={tagCounts}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        sort={sort}
        sortOptions={recipes.length > 0 ? SORT_OPTIONS : []}
        onSortChange={handleSortChange}
      />

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
                  <Icon name="add" />
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
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
