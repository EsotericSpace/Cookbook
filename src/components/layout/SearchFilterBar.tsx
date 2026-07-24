import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Icon } from "../ui/icon"
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "../ui/popover"
import { cn } from "../../lib/utils"
import { EFFORT_LEVELS } from "../../lib/types"
import type { ActiveFilters } from "../../lib/types"

const CATEGORY_ORDER = ["meal", "dishType", "cuisine", "protein", "effort", "diet"]
const CATEGORY_LABELS: Record<string, string> = {
  meal: "Meal",
  dishType: "Dish Type",
  cuisine: "Cuisine",
  protein: "Protein",
  effort: "Effort",
  diet: "Diet",
}

interface SortOption {
  value: string
  label: string
}

interface CategoryDropdownProps {
  category: string
  label: string
  values: string[]
  tagCounts: Record<string, Record<string, number>>
  activeFilters: ActiveFilters
  onFilterChange: (category: string, value: string, checked: boolean) => void
}

// One filter category as its own compact dropdown, labeled above it rather
// than inside the trigger. The trigger itself summarizes the selection —
// "All" when nothing's checked, otherwise the checked value(s) — rather
// than a bare category name + count.
function CategoryDropdown({ category, label, values, tagCounts, activeFilters, onFilterChange }: CategoryDropdownProps) {
  const active = activeFilters[category] ?? []
  const summary = active.length === 0 ? "All" : active.length === 1 ? active[0] : `${active[0]} +${active.length - 1}`

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full justify-between font-normal", active.length > 0 && "border-primary text-primary")}
          >
            <span className="truncate capitalize">{summary}</span>
            <Icon name="expand_more" size="sm" className="opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 max-h-72 overflow-y-auto p-2 space-y-1" align="start">
          {values.map(value => {
            const count = tagCounts[category]?.[value] ?? 0
            const checked = active.includes(value)
            const id = `filter-${category}-${value}`
            return (
              <div key={value} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted">
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={c => onFilterChange(category, value, c === true)}
                />
                <Label htmlFor={id} className="flex flex-1 items-center justify-between text-sm cursor-pointer font-normal">
                  <span className="capitalize">{value}</span>
                  <Badge variant="secondary" className="text-xs ml-3 h-5 px-1.5">{count}</Badge>
                </Label>
              </div>
            )
          })}
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface SearchFilterBarProps {
  query: string
  onQueryChange: (value: string) => void
  allTags: Record<string, string[]>
  tagCounts: Record<string, Record<string, number>>
  activeFilters: ActiveFilters
  onFilterChange: (category: string, value: string, checked: boolean) => void
  onClearAll: () => void
  sort: string
  sortOptions: SortOption[]
  onSortChange: (value: string) => void
}

// Sort, search, and every filter category (including meal) live in one
// toolbar row: a sort button, then a search input joined to a single
// Filters button covering all facets as flat, non-collapsing chip groups.
export default function SearchFilterBar({
  query,
  onQueryChange,
  allTags,
  tagCounts,
  activeFilters,
  onFilterChange,
  onClearAll,
  sort,
  sortOptions,
  onSortChange,
}: SearchFilterBarProps) {
  const visibleCategories = CATEGORY_ORDER.filter(cat => allTags[cat]?.length > 0)
  const activeFilterCount = visibleCategories.reduce((sum, cat) => sum + (activeFilters[cat]?.length ?? 0), 0)
  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="flex items-center gap-2">
      {sortOptions.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 w-10 p-0 shrink-0">
              <Icon name="sort" size="sm" className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-1 w-44" align="start">
            {sortOptions.map(o => (
              <PopoverClose key={o.value} asChild>
                <button
                  type="button"
                  onClick={() => onSortChange(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted",
                    sort === o.value && "font-medium text-primary"
                  )}
                >
                  {o.label}
                  {sort === o.value && <Icon name="check" size="sm" />}
                </button>
              </PopoverClose>
            ))}
          </PopoverContent>
        </Popover>
      )}

      <div className="flex h-10 flex-1 items-center gap-1 rounded-md border border-input bg-background pl-3 pr-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
        <Icon name="search" size="sm" className="text-muted-foreground shrink-0" />
        <Input
          placeholder="Search recipes or list ingredients..."
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          className="h-full border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {visibleCategories.length > 0 && (
          <>
            <div className="h-5 w-px bg-border shrink-0" />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 shrink-0", hasActiveFilters && "text-primary")}
                >
                  <Icon name="tune" size="sm" className="opacity-50" />
                  <span className="hidden sm:inline">Filters</span>
                  {hasActiveFilters && (
                    <Badge className="h-4 px-1.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-4 w-96" align="end">
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                  {visibleCategories.map(category => {
                    const values =
                      category === "effort" ? EFFORT_LEVELS.filter(level => allTags[category]?.includes(level)) :
                      allTags[category] ?? []
                    return (
                      <CategoryDropdown
                        key={category}
                        category={category}
                        label={CATEGORY_LABELS[category] ?? category}
                        values={values}
                        tagCounts={tagCounts}
                        activeFilters={activeFilters}
                        onFilterChange={onFilterChange}
                      />
                    )
                  })}
                </div>
                {hasActiveFilters && (
                  <PopoverClose asChild>
                    <Button variant="ghost" size="sm" onClick={onClearAll} className="w-full mt-4 text-muted-foreground hover:text-foreground">
                      <Icon name="close" size="sm" />
                      Clear filters
                    </Button>
                  </PopoverClose>
                )}
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>
    </div>
  )
}
