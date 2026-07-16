import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Icon } from "../ui/icon"
import type { Ingredient, IngredientSection } from "../../lib/types"

const UNITS = [
  // Weight
  "lb",
  "oz",
  "g",
  "kg",
  // Volume
  "cup",
  "pt",
  "qt",
  "fl oz",
  "tbsp",
  "tsp",
  "ml",
  "L",
  "dash",
  "pinch",
]

interface IngredientInputProps {
  sections: IngredientSection[]
  onChange: (sections: IngredientSection[]) => void
}

export default function IngredientInput({ sections, onChange }: IngredientInputProps) {
  function updateSection(index: number, section: IngredientSection) {
    onChange(sections.map((s, i) => (i === index ? section : s)))
  }

  function updateIngredient(sectionIndex: number, itemIndex: number, field: keyof Ingredient, value: string) {
    const section = sections[sectionIndex]
    updateSection(sectionIndex, {
      ...section,
      items: section.items.map((ing, i) => (i === itemIndex ? { ...ing, [field]: value } : ing)),
    })
  }

  function removeIngredient(sectionIndex: number, itemIndex: number) {
    const section = sections[sectionIndex]
    updateSection(sectionIndex, { ...section, items: section.items.filter((_, i) => i !== itemIndex) })
  }

  function addIngredient(sectionIndex: number) {
    const section = sections[sectionIndex]
    updateSection(sectionIndex, { ...section, items: [...section.items, { item: "", quantity: "", unit: "" }] })
  }

  function updateSectionTitle(sectionIndex: number, title: string) {
    updateSection(sectionIndex, { ...sections[sectionIndex], title })
  }

  function removeSection(sectionIndex: number) {
    onChange(sections.filter((_, i) => i !== sectionIndex))
  }

  function addSection() {
    onChange([...sections, { title: "", items: [{ item: "", quantity: "", unit: "" }] }])
  }

  return (
    <div className="space-y-4">
      <datalist id="unit-options">
        {UNITS.map(u => <option key={u} value={u} />)}
      </datalist>

      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-2">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Section name (optional)"
              value={section.title ?? ""}
              onChange={e => updateSectionTitle(sectionIndex, e.target.value)}
              className="font-medium"
            />
            {sectionIndex > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSection(sectionIndex)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Icon name="delete" />
              </Button>
            )}
          </div>

          {section.items.map((ing, itemIndex) => (
            <div key={itemIndex} className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Ingredient"
                  value={ing.item}
                  onChange={e => updateIngredient(sectionIndex, itemIndex, "item", e.target.value)}
                />
              </div>
              <div className="w-24">
                <Input
                  placeholder="Qty"
                  value={ing.quantity}
                  onChange={e => updateIngredient(sectionIndex, itemIndex, "quantity", e.target.value)}
                />
              </div>
              <div className="w-28">
                <Input
                  placeholder="Unit"
                  list="unit-options"
                  value={ing.unit}
                  onChange={e => updateIngredient(sectionIndex, itemIndex, "unit", e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(sectionIndex, itemIndex)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Icon name="delete" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addIngredient(sectionIndex)}
            className="mt-1"
          >
            <Icon name="add" className="text-primary" />
            Add ingredient
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addSection}>
        <Icon name="add" className="text-primary" />
        Add section
      </Button>
    </div>
  )
}
