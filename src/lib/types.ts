export interface Ingredient {
  item: string
  quantity: string
  unit: string
}

export type TagCategory = "cuisine" | "protein" | "meal" | "effort" | "diet" | "custom"

export const EFFORT_LEVELS = ["Easy", "Medium", "Difficult"] as const

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
