import { BrowserRouter, Routes, Route } from "react-router-dom"
import { useEffect, useState } from "react"
import { initializeStorage } from "./lib/storage"
import { initializeAuth } from "./lib/auth"
import Navbar from "./components/layout/Navbar"
import RecipeListPage from "./pages/RecipeListPage"
import RecipeDetailPage from "./pages/RecipeDetailPage"
import AddRecipePage from "./pages/AddRecipePage"
import ShoppingListPage from "./pages/ShoppingListPage"
import ProfilePage from "./pages/ProfilePage"
import { Toaster } from "./components/ui/sonner"

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Auth resolves first (cheap, no network round-trip once a session is
    // cached locally) so storage's initial load can reliably tell whether
    // there's a signed-in user — it needs that to ensure a profile row
    // exists for them.
    initializeAuth().then(() => initializeStorage()).then(() => setReady(true))
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
          {ready ? (
            <Routes>
              <Route path="/" element={<RecipeListPage />} />
              <Route path="/recipe/:id" element={<RecipeDetailPage />} />
              <Route path="/add" element={<AddRecipePage />} />
              <Route path="/shopping/:id" element={<ShoppingListPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          ) : (
            <div className="flex items-center justify-center py-24">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  )
}
