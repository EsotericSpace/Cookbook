import * as React from "react"
import { Command } from "cmdk"
import { cn } from "../../lib/utils"
import { Icon } from "./icon"

interface ComboboxProps {
  options: string[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  allowCreate?: boolean
  optionColors?: Record<string, string>  // option value → dot bg class
}

export function Combobox({ options, value, onChange, placeholder = "Select...", allowCreate = false, optionColors }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  )

  const showCreate =
    allowCreate &&
    search.trim() !== "" &&
    !options.some(opt => opt.toLowerCase() === search.toLowerCase().trim()) &&
    !value.includes(search.trim())

  function toggleOption(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt))
    } else {
      onChange([...value, opt])
    }
    setSearch("")
  }

  function createOption() {
    const newVal = search.trim()
    if (newVal && !value.includes(newVal)) {
      onChange([...value, newVal])
    }
    setSearch("")
  }

  function removeValue(v: string) {
    onChange(value.filter(x => x !== v))
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "min-h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text flex flex-wrap gap-1 items-center",
        )}
        onClick={() => setOpen(true)}
      >
        {value.map(v => (
          <span
            key={v}
            className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium"
          >
            {v}
            <button
              type="button"
              className="hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); removeValue(v) }}
            >
              <Icon name="close" size="xs" />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[60px] bg-transparent outline-none placeholder:text-muted-foreground text-sm"
          placeholder={value.length === 0 ? placeholder : ""}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        <Icon name="expand_more" className="shrink-0 text-muted-foreground ml-auto" />
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-background shadow-md overflow-hidden">
          <Command shouldFilter={false}>
            <Command.List className="max-h-48 overflow-y-auto p-1">
              {filteredOptions.length === 0 && !showCreate && (
                <Command.Empty className="py-2 px-3 text-sm text-muted-foreground">
                  No options found.
                </Command.Empty>
              )}
              {filteredOptions.map(opt => (
                <Command.Item
                  key={opt}
                  value={opt}
                  onSelect={() => toggleOption(opt)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded cursor-pointer hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded-sm border border-primary flex items-center justify-center shrink-0",
                      value.includes(opt) ? "bg-primary" : "bg-transparent"
                    )}
                  >
                    {value.includes(opt) && (
                      <Icon name="check" size="xxs" className="text-primary-foreground" />
                    )}
                  </span>
                  {optionColors?.[opt] && (
                    <span className={cn("w-2 h-2 rounded-full shrink-0", optionColors[opt])} />
                  )}
                  {opt}
                </Command.Item>
              ))}
              {showCreate && (
                <Command.Item
                  value={`create:${search}`}
                  onSelect={createOption}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded cursor-pointer hover:bg-accent hover:text-accent-foreground text-primary font-medium"
                >
                  + Create "{search.trim()}"
                </Command.Item>
              )}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  )
}
