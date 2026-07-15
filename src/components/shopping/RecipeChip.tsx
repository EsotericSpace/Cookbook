import { useNavigate } from "react-router-dom"
import { Icon } from "../ui/icon"
import type { Recipe } from "../../lib/types"

interface RecipeChipProps {
  recipe: Recipe
  onRemove: () => void
  disabled?: boolean
}

export default function RecipeChip({ recipe, onRemove, disabled }: RecipeChipProps) {
  const navigate = useNavigate()

  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-sm font-medium">
      <button
        type="button"
        className="hover:text-primary transition-colors"
        onClick={() => navigate(`/recipe/${recipe.id}`)}
      >
        {recipe.title}
      </button>
      {!disabled && (
        <button
          type="button"
          className="ml-1 rounded-full hover:bg-muted p-0.5 transition-colors"
          onClick={onRemove}
          aria-label={`Remove ${recipe.title}`}
        >
          <Icon name="close" size="xs" />
        </button>
      )}
    </span>
  )
}
