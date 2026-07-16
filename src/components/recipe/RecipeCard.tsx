import { useState } from "react"
import { Badge, tagCategoryColor } from "../ui/badge"
import { Icon } from "../ui/icon"
import { cn } from "../../lib/utils"
import { getHeaderColors, mealGradientStyle, parseMinutes, formatTime } from "../../lib/colors"
import { getTagColor } from "../../lib/storage"
import { useFitText } from "../../lib/useFitText"
import type { Recipe } from "../../lib/types"

interface RecipeCardProps {
  recipe: Recipe
  onClick: () => void
}

const MAX_VISIBLE_TAGS = 4

// Meal type always leads the tag row, followed by diet, cuisine, protein,
// effort, then custom tags last.
const TAG_CATEGORY_ORDER: Record<string, number> = { meal: 0, dishType: 1, diet: 2, cuisine: 3, protein: 4, effort: 5, custom: 6 }

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const [imageError, setImageError] = useState(false)
  const showImage = !!recipe.imageUrl && !imageError

  const mealTags = recipe.tags.filter(t => t.category === "meal")
  const mealValues = mealTags.map(t => t.value)
  const FALLBACK_COLORS: Record<string, string> = {
    breakfast: "amber", lunch: "teal", dinner: "orange", dessert: "purple", snack: "pink",
  }
  const colorKeys = mealValues.map(v =>
    getTagColor("meal", v) ?? FALLBACK_COLORS[v.toLowerCase()] ?? "stone"
  )
  const header = getHeaderColors(colorKeys[0])
  const gradientStyle = mealGradientStyle(colorKeys)

  const prepMin = parseMinutes(recipe.prepTime)
  const cookMin = parseMinutes(recipe.cookTime)

  const sortedTags = recipe.tags
    .slice()
    .sort((a, b) => (TAG_CATEGORY_ORDER[a.category] ?? 99) - (TAG_CATEGORY_ORDER[b.category] ?? 99))

  const { ref: titleRef, fontSize: titleFontSize } = useFitText<HTMLParagraphElement>(recipe.title, { min: 12, max: 18 })

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden bg-card shadow-[0_8px_20px_-6px_rgba(0,0,0,0.12)] transition-shadow",
        "aspect-square grid grid-rows-[3fr_1fr] cursor-pointer hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.18)]"
      )}
      onClick={onClick}
    >
      {/* Header band: photo (if available) or colored gradient — 3/4 of the card */}
      <div className="relative overflow-hidden min-h-0">
        {showImage ? (
          <img
            src={recipe.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={cn("h-full", !gradientStyle && header.bg)}
            style={gradientStyle}
          />
        )}
      </div>

      {/* Body — remaining 1/4 of the card */}
      <div className="p-3 flex flex-col justify-between h-full overflow-hidden min-h-0">
        {/* Title */}
        <p
          ref={titleRef}
          className="leading-snug whitespace-nowrap font-semibold text-foreground"
          style={{ fontSize: titleFontSize }}
        >
          {recipe.title}
        </p>

        <div className="space-y-1.5">
          {/* Icon metadata row */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {recipe.prepTime && (
              <span className="flex items-center gap-1">
                <Icon name="restaurant" size="xs" />
                <span className="flex items-center gap-2">
                  Prep
                  <span className="text-foreground font-medium">{prepMin != null ? formatTime(prepMin) : recipe.prepTime}</span>
                </span>
              </span>
            )}
            {recipe.cookTime && (
              <span className="flex items-center gap-1">
                <Icon name="local_fire_department" size="xs" />
                <span className="flex items-center gap-2">
                  Cook
                  <span className="text-foreground font-medium">{cookMin != null ? formatTime(cookMin) : recipe.cookTime}</span>
                </span>
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Icon name="group" size="xs" />
                <span className="flex items-center gap-2">
                  Serves
                  <span className="text-foreground font-medium">{recipe.servings}</span>
                </span>
              </span>
            )}
          </div>

          {/* Tags */}
          {sortedTags.length > 0 && (
            <div className="flex flex-nowrap gap-1 overflow-hidden">
              {sortedTags.slice(0, MAX_VISIBLE_TAGS).map((tag, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className={cn("text-xs px-2 py-0.5 rounded-full shrink-0", tagCategoryColor(tag.category))}
                >
                  {tag.value}
                </Badge>
              ))}
              {sortedTags.length > MAX_VISIBLE_TAGS && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full shrink-0 text-muted-foreground">
                  +{sortedTags.length - MAX_VISIBLE_TAGS}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
