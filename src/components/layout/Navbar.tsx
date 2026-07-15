import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Icon } from "../ui/icon"
import { useTheme } from "../../lib/theme"
import AuthControl from "./AuthControl"

export default function Navbar() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "")
  const { theme, toggleTheme } = useTheme()

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
            placeholder="Search, or list ingredients: eggs, feta, tomatoes"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Icon name="light_mode" size="lg" /> : <Icon name="dark_mode" size="lg" />}
          </Button>
          <AuthControl />
        </div>
      </div>
    </header>
  )
}
