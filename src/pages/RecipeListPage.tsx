import { useSyncExternalStore, useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import SearchFilterBar from "../components/layout/SearchFilterBar"
import RecipeCard from "../components/recipe/RecipeCard"
import { Button } from "../components/ui/button"
import { Icon } from "../components/ui/icon"
import { getRecipes, getAllTags, getTagColor, subscribe, getVersion } from "../lib/storage"
import { getHeaderColors, mealColorKey } from "../lib/colors"
import { useSession } from "../lib/auth"
import { applySearchAndFilter } from "../lib/search"
import { cn } from "../lib/utils"
import type { Recipe, ActiveFilters } from "../lib/types"

// Sections are ordered alphabetically rather than by some fixed "day order"
// (Breakfast/Lunch/Dinner/...) — no meal category gets to jump the queue.
// "Other" (recipes with no recognized meal tag — shouldn't happen given
// RecipeForm requires one, but tags aren't type-guaranteed) is pinned last
// since it's a fallback bucket, not a real category.
//
// A recipe can carry more than one meal tag (e.g. Breakfast + Dinner). With
// no meal filter active, it buckets under whichever tag comes first
// alphabetically. But once the user has filtered to specific meal(s), it
// should bucket under one of *those* instead — seeing it land in a section
// they didn't ask for (e.g. Breakfast showing up after filtering to Lunch)
// is exactly the confusing case this avoids.
function groupByMeal(recipes: Recipe[], activeMeals: string[]): Array<{ meal: string; recipes: Recipe[] }> {
  const buckets = new Map<string, Recipe[]>()
  for (const recipe of recipes) {
    const mealValues = recipe.tags.filter(t => t.category === "meal").map(t => t.value)
    const candidates = (activeMeals.length > 0 ? mealValues.filter(m => activeMeals.includes(m)) : mealValues).sort()
    const primary = candidates[0] ?? "Other"
    if (!buckets.has(primary)) buckets.set(primary, [])
    buckets.get(primary)!.push(recipe)
  }
  const groups = [...buckets.keys()].filter(m => m !== "Other").sort().map(meal => ({ meal, recipes: buckets.get(meal)! }))
  if (buckets.has("Other")) groups.push({ meal: "Other", recipes: buckets.get("Other")! })
  return groups
}

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
  const sort = searchParams.get("sort") ?? "date-desc"
  const activeFilters = parseFilters(searchParams.get("filters"))

  // Debounce search input -> URL param (formerly lived in Navbar, moved here
  // since search only ever affected this page — typing in it elsewhere did
  // nothing).
  const [inputValue, setInputValue] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (inputValue.trim()) {
        params.set("q", inputValue)
      } else {
        params.delete("q")
      }
      setSearchParams(params, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  // Sync input if URL changes externally
  useEffect(() => {
    setInputValue(query)
  }, [query])

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

  // Once any other filter narrows the list (cuisine/protein/effort/diet/dish
  // type), group into meal sections too, same as an explicit meal filter
  // would — treat meal as if every value were selected rather than none, so
  // "no meal filter" only means "show everything flat" when truly nothing
  // is filtered at all.
  const hasMealFilter = (activeFilters.meal?.length ?? 0) > 0
  const hasOtherFilter = Object.entries(activeFilters).some(([cat, vals]) => cat !== "meal" && vals.length > 0)
  const shouldGroupByMeal = hasMealFilter || hasOtherFilter
  const effectiveMealFilter = hasMealFilter ? activeFilters.meal! : hasOtherFilter ? allTags.meal ?? [] : []

  return (
    <div className="space-y-4">
      <SearchFilterBar
        query={inputValue}
        onQueryChange={setInputValue}
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
        ) : shouldGroupByMeal ? (
          // A filter is active (meal or otherwise) — group into labeled
          // sections so it's clear which meal(s) the results fall into.
          <div className="space-y-8">
            {groupByMeal(displayed, effectiveMealFilter).map(({ meal, recipes: group }) => {
              const headerColors = getHeaderColors(mealColorKey(meal, getTagColor("meal", meal)))
              return (
                <section key={meal}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn("h-2.5 w-2.5 rounded-full", headerColors.dot)} />
                    <h2 className="text-lg font-semibold">{meal}</h2>
                    <span className="text-sm text-muted-foreground">{group.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.map(recipe => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        onClick={() => navigate(`/recipe/${recipe.id}`)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          // No meal filter — one flat grid, not broken out by meal.
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
