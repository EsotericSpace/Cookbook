import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Icon } from "../ui/icon"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu"
import { useSession } from "../../lib/auth"
import { createShoppingList } from "../../lib/storage"
import SettingsMenu from "./SettingsMenu"
import LoginButton from "./LoginButton"

export default function Navbar() {
  const navigate = useNavigate()
  const session = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "")

  // Debounce search input -> URL param
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (inputValue.trim()) {
        params.set("q", inputValue)
      } else {
        params.delete("q")
      }
      setSearchParams(params, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  // Sync input if URL changes externally
  useEffect(() => {
    setInputValue(searchParams.get("q") ?? "")
  }, [searchParams.get("q")])

  function handleNewShoppingList() {
    const name = `Shopping list — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    const newList = createShoppingList(name, [])
    navigate(`/shopping/${newList.id}`)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 max-w-7xl h-16 flex items-center gap-4">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate("/") }}
          className="text-xl font-bold text-primary shrink-0 hover:opacity-80 transition-opacity"
        >
          Cookbook
        </a>

        <div className="flex-1 max-w-md mx-auto relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search recipes or list ingredients..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <SettingsMenu />
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" aria-label="Create">
                  <Icon name="add" size="sm" />
                  <span className="hidden sm:inline">Create</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/add")}>
                  <Icon name="menu_book" size="sm" className="opacity-50" />
                  Recipe
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNewShoppingList}>
                  <Icon name="shopping_cart" size="sm" className="opacity-50" />
                  Shopping list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  )
}
