import { useSyncExternalStore } from "react"
import { useParams, useNavigate } from "react-router-dom"
import RecipeDetail from "../components/recipe/RecipeDetail"
import { Button } from "../components/ui/button"
import { Icon } from "../components/ui/icon"
import { getRecipes, updateRecipe, deleteRecipe, subscribe, getVersion } from "../lib/storage"
import type { Recipe } from "../lib/types"

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const recipes = useSyncExternalStore(subscribe, getRecipes)
  useSyncExternalStore(subscribe, getVersion) // RecipeDetail also reads shopping lists directly
  const recipe: Recipe | null = recipes.find(r => r.id === id) ?? null

  function handleUpdate(updates: Partial<Recipe>) {
    if (!id) return
    updateRecipe(id, updates)
  }

  function handleDelete() {
    if (!id) return
    deleteRecipe(id)
    navigate("/")
  }

  if (recipe === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-xl font-semibold mb-4">Recipe not found</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="px-0 text-primary hover:text-primary hover:bg-transparent"
        >
          <Icon name="chevron_left" />
          Back to recipes
        </Button>
      </div>
    )
  }

  return (
    <RecipeDetail
      recipe={recipe}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onBack={() => navigate("/")}
    />
  )
}
