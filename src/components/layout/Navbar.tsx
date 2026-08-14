import { useNavigate } from "react-router-dom"
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
          className="text-2xl font-bold uppercase text-primary shrink-0 hover:opacity-80 transition-opacity"
          style={{ fontFamily: "Fredoka, sans-serif" }}
        >
          Cookadoo
        </a>

        <div className="flex-1" />

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
