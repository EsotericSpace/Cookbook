import { useSyncExternalStore } from "react"
import { Button } from "../ui/button"
import { Icon } from "../ui/icon"
import { cn } from "../../lib/utils"
import { isRecipeBookmarked, toggleBookmark, subscribe } from "../../lib/storage"

interface BookmarkButtonProps {
  recipeId: string
  variant?: "overlay" | "inline"
}

export default function BookmarkButton({ recipeId, variant = "inline" }: BookmarkButtonProps) {
  const bookmarked = useSyncExternalStore(subscribe, () => isRecipeBookmarked(recipeId))

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    toggleBookmark(recipeId)
  }

  // The "Outlined" variable font has no separate filled/unfilled icon
  // names — bookmark and bookmark_border share one glyph — so the filled
  // look for the bookmarked state comes from the FILL axis instead.
  const icon = (
    <Icon
      name="bookmark"
      size={variant === "overlay" ? "sm" : "md"}
      style={bookmarked ? { fontVariationSettings: "'FILL' 1" } : undefined}
      className={bookmarked ? "text-primary" : undefined}
    />
  )

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark recipe"}
        className={cn(
          "absolute top-2 right-2 flex items-center justify-center h-8 w-8 rounded-full",
          "bg-background/80 backdrop-blur shadow hover:bg-background transition-colors",
          !bookmarked && "text-muted-foreground"
        )}
      >
        {icon}
      </button>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      {icon}
      {bookmarked ? "Bookmarked" : "Bookmark"}
    </Button>
  )
}
