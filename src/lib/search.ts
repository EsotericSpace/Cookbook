import type { Recipe, ActiveFilters } from "./types"

export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  if (!query.trim()) return recipes

  const terms = query.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)

  // Comma-separated terms (e.g. "eggs, feta, tomatoes") match recipes that
  // call for all of those ingredients together, rather than the usual
  // title/ingredient/body search.
  if (terms.length > 1) {
    return recipes.filter(r =>
      terms.every(term => r.ingredients.some(sec => sec.items.some(i => i.item.toLowerCase().includes(term))))
    )
  }

  const q = terms[0]

  const titleMatches: Recipe[] = []
  const ingredientMatches: Recipe[] = []
  const bodyMatches: Recipe[] = []

  for (const r of recipes) {
    if (r.title.toLowerCase().includes(q)) {
      titleMatches.push(r)
    } else if (r.ingredients.some(sec => sec.items.some(i => i.item.toLowerCase().includes(q)))) {
      ingredientMatches.push(r)
    } else if (
      r.steps.some(sec => sec.items.some(s => s.toLowerCase().includes(q))) ||
      r.notes?.toLowerCase().includes(q)
    ) {
      bodyMatches.push(r)
    }
  }
  return [...titleMatches, ...ingredientMatches, ...bodyMatches]
}

export function filterByTags(recipes: Recipe[], activeFilters: ActiveFilters): Recipe[] {
  const categories = Object.entries(activeFilters).filter(([, values]) => values.length > 0)
  if (categories.length === 0) return recipes
  return recipes.filter(recipe =>
    categories.every(([category, values]) =>
      recipe.tags.some(t => t.category === category && values.includes(t.value))
    )
  )
}

export function applySearchAndFilter(recipes: Recipe[], query: string, activeFilters: ActiveFilters): Recipe[] {
  return searchRecipes(filterByTags(recipes, activeFilters), query)
}
