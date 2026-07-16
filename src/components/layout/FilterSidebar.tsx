import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Icon } from "../ui/icon"
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "../ui/popover"
import { cn } from "../../lib/utils"
import { EFFORT_LEVELS } from "../../lib/types"
import type { ActiveFilters } from "../../lib/types"

interface SortOption {
  value: string
  label: string
}

interface FilterSidebarProps {
  allTags: Record<string, string[]>
  tagCounts: Record<string, Record<string, number>>
  activeFilters: ActiveFilters
  onFilterChange: (category: string, value: string, checked: boolean) => void
  onClearAll: () => void
  sort: string
  sortOptions: SortOption[]
  onSortChange: (value: string) => void
}

const CATEGORY_ORDER = ["meal", "dishType", "cuisine", "protein", "effort", "diet", "custom"]
const CATEGORY_LABELS: Record<string, string> = {
  meal: "Meal",
  dishType: "Dish Type",
  cuisine: "Cuisine",
  protein: "Protein",
  effort: "Effort",
  diet: "Diet",
  custom: "Custom",
}

export default function FilterSidebar({
  allTags,
  tagCounts,
  activeFilters,
  onFilterChange,
  onClearAll,
  sort,
  sortOptions,
  onSortChange,
}: FilterSidebarProps) {
  const hasActiveFilters = Object.values(activeFilters).some(v => v.length > 0)
  const visibleCategories = CATEGORY_ORDER.filter(cat => allTags[cat]?.length > 0)

  return (
    <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {sortOptions.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0">
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

      {visibleCategories.map(category => {
        const activeCount = activeFilters[category]?.length ?? 0
        return (
          <Popover key={category}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1.5 h-8 shrink-0",
                  activeCount > 0 && "border-primary text-primary"
                )}
              >
                {CATEGORY_LABELS[category] ?? category}
                {activeCount > 0 && (
                  <Badge className="h-4 px-1.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                    {activeCount}
                  </Badge>
                )}
                <Icon name="expand_more" size="sm" className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-2 space-y-1">
              {(category === "effort"
                ? EFFORT_LEVELS.filter(level => allTags[category]?.includes(level))
                : allTags[category] ?? []
              ).map(value => {
                const count = tagCounts[category]?.[value] ?? 0
                const checked = activeFilters[category]?.includes(value) ?? false
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
        )
      })}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-8 gap-1 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Icon name="close" size="sm" />
          Clear all
        </Button>
      )}
    </div>
  )
}
