export interface Ingredient {
  item: string
  quantity: string
  unit: string
}

export type TagCategory = "cuisine" | "protein" | "meal" | "dishType" | "effort" | "diet"

export const EFFORT_LEVELS = ["Easy", "Medium", "Difficult"] as const

// Standard vocabulary for the "meal" tag category — kept fixed rather than
// letting it grow open-ended (see MEAL_OCCASIONS usage in import.ts, which
// filters out noisy scraped values like "Main Course" that don't map here).
export const MEAL_OCCASIONS = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack"] as const

// "meal" is occasion only (when you'd eat it); "dishType" is format (what
// it is) — split out so meal doesn't keep absorbing things like "Salad" or
// "One-pan" that aren't actually occasions.
export const DISH_TYPES = ["Salad", "Soup", "Pasta", "One-pan"] as const

export interface Tag {
  category: TagCategory
  value: string
}

export interface Recipe {
  id: string
  userId: string
  title: string
  source?: string
  prepTime?: string
  cookTime?: string
  servings?: number
  imageUrl?: string
  ingredients: Ingredient[]
  steps: string[]
  tags: Tag[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type ActiveFilters = Record<string, string[]>

export interface ShoppingListItem {
  id: string
  name: string
  amount: number
  unit: string | null
  sourceRecipeIds: string[]
  aisle: string
}

export interface ShoppingList {
  id: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
  sourceRecipeIds: string[]
  items: ShoppingListItem[]
}

export interface TagRegistryEntry {
  id: string
  createdBy: string
  category: string
  value: string
  colorKey: string
}

export interface Profile {
  id: string
  displayName: string
  isAdmin: boolean
}
