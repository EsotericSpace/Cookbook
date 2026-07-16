import { useState } from "react"
import { Label } from "../ui/label"
import { Combobox } from "../ui/combobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { ColorPicker } from "../ui/ColorPicker"
import { getTagRegistry, registerTag, getTagColor } from "../../lib/storage"
import { COLOR_PALETTE } from "../../lib/colors"
import { toTitleCase } from "../../lib/utils"
import { EFFORT_LEVELS, DISH_TYPES } from "../../lib/types"
import type { Tag, TagCategory } from "../../lib/types"

interface TagInputProps {
  tags: Tag[]
  onChange: (tags: Tag[]) => void
  existingTags: Record<string, string[]>
}

const TAG_CATEGORIES: { key: TagCategory; label: string }[] = [
  { key: "meal",     label: "Meal Type"    },
  { key: "dishType", label: "Dish Type"    },
  { key: "cuisine",  label: "Cuisine"      },
  { key: "protein",  label: "Protein"      },
  { key: "effort",   label: "Effort Level" },
  { key: "diet",     label: "Diet"         },
  { key: "custom",   label: "Custom Tags"  },
]

export default function TagInput({ tags, onChange, existingTags }: TagInputProps) {
  const [pendingMeal, setPendingMeal] = useState<string | null>(null)

  function getValuesForCategory(category: TagCategory): string[] {
    return tags.filter(t => t.category === category).map(t => t.value)
  }

  function handleCategoryChange(category: TagCategory, values: string[]) {
    const otherTags = tags.filter(t => t.category !== category)
    onChange([...otherTags, ...values.map(v => ({ category, value: toTitleCase(v) }))])
  }

  function handleEffortChange(value: string) {
    handleCategoryChange("effort", value === "none" ? [] : [value])
  }

  function handleMealChange(values: string[]) {
    const prev = getValuesForCategory("meal")
    const added = values.find(v => !prev.some(p => p.toLowerCase() === v.toLowerCase()))

    if (added) {
      const inRegistry = getTagColor("meal", added) !== null
      if (!inRegistry) {
        setPendingMeal(toTitleCase(added))
        return
      }
    }

    handleCategoryChange("meal", values)
  }

  function handleColorPick(colorKey: string) {
    if (!pendingMeal) return
    registerTag("meal", pendingMeal, colorKey)
    handleCategoryChange("meal", [...getValuesForCategory("meal"), pendingMeal])
    setPendingMeal(null)
  }

  // Build dot color map for the meal combobox
  function mealOptionColors(): Record<string, string> {
    const registry = getTagRegistry().filter(e => e.category === "meal")
    const map: Record<string, string> = {}
    for (const entry of registry) {
      const palette = COLOR_PALETTE[entry.colorKey as keyof typeof COLOR_PALETTE]
      if (palette) map[entry.value.toLowerCase()] = palette.dot
    }
    // Also key by original casing from existingTags
    for (const opt of existingTags["meal"] ?? []) {
      const colorKey = getTagColor("meal", opt)
      if (colorKey) {
        const palette = COLOR_PALETTE[colorKey as keyof typeof COLOR_PALETTE]
        if (palette) map[opt] = palette.dot
      }
    }
    return map
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {TAG_CATEGORIES.map(({ key, label }) => (
        <div key={key} className="space-y-1.5">
          <Label className="capitalize">{label}</Label>
          {key === "effort" ? (
            <Select value={getValuesForCategory("effort")[0] ?? "none"} onValueChange={handleEffortChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select effort..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {EFFORT_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : key === "dishType" ? (
            <Combobox
              options={[...DISH_TYPES]}
              value={getValuesForCategory("dishType")}
              onChange={values => handleCategoryChange("dishType", values)}
              placeholder="Add dish type..."
            />
          ) : (
            <Combobox
              options={existingTags[key] ?? []}
              value={getValuesForCategory(key)}
              onChange={values => key === "meal" ? handleMealChange(values) : handleCategoryChange(key, values)}
              placeholder={`Add ${label.toLowerCase()}...`}
              allowCreate
              optionColors={key === "meal" ? mealOptionColors() : undefined}
            />
          )}
          {key === "meal" && pendingMeal && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Pick a color for <strong>{pendingMeal}</strong></p>
              <ColorPicker value="" onChange={handleColorPick} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
