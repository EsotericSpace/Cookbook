import { useSyncExternalStore } from "react"
import { useNavigate } from "react-router-dom"
import RecipeCard from "../components/recipe/RecipeCard"
import { Icon } from "../components/ui/icon"
import { getBookmarkedRecipes, getDisplayName, subscribe } from "../lib/storage"
import { useSession } from "../lib/auth"

export default function ProfilePage() {
  const navigate = useNavigate()
  const session = useSession()
  const displayName = useSyncExternalStore(subscribe, () => session ? getDisplayName(session.user.id) : null)
  const bookmarked = useSyncExternalStore(subscribe, getBookmarkedRecipes)

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Icon name="person" size="xl" className="text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to see your bookmarks</h2>
        <p className="text-muted-foreground">Your saved recipes will show up here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{displayName ?? session.user.email}</h1>
        <p className="text-muted-foreground text-sm mt-1">Your bookmarked recipes</p>
      </div>

      {bookmarked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Icon name="bookmark" size="xl" className="text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No bookmarks yet</h2>
          <p className="text-muted-foreground">Bookmark a recipe you like and it'll show up here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarked.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => navigate(`/recipe/${recipe.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
