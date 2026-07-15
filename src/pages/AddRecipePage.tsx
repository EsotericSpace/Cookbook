import { useNavigate } from "react-router-dom"
import RecipeForm from "../components/recipe/RecipeForm"
import { addRecipe, getAllTags } from "../lib/storage"
import { getCurrentUserId } from "../lib/auth"
import type { Recipe } from "../lib/types"

export default function AddRecipePage() {
  const navigate = useNavigate()
  const existingTags = getAllTags()

  function handleSave(data: Omit<Recipe, "id" | "userId" | "createdAt" | "updatedAt">) {
    const userId = getCurrentUserId()
    if (!userId) return
    const now = new Date().toISOString()
    const newRecipe: Recipe = {
      ...data,
      id: crypto.randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
    }
    addRecipe(newRecipe)
    navigate(`/recipe/${newRecipe.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Recipe</h1>
        <p className="text-muted-foreground text-sm mt-1">Fill in the details for your new recipe.</p>
      </div>
      <RecipeForm
        onSave={handleSave}
        onCancel={() => navigate("/")}
        existingTags={existingTags}
      />
    </div>
  )
}
