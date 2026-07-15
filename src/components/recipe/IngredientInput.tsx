import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Icon } from "../ui/icon"
import type { Ingredient } from "../../lib/types"

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
  ingredients: Ingredient[]
  onChange: (ingredients: Ingredient[]) => void
}

export default function IngredientInput({ ingredients, onChange }: IngredientInputProps) {
  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    const updated = ingredients.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    )
    onChange(updated)
  }

  function removeIngredient(index: number) {
    onChange(ingredients.filter((_, i) => i !== index))
  }

  function addIngredient() {
    onChange([...ingredients, { item: "", quantity: "", unit: "" }])
  }

  return (
    <div className="space-y-2">
      <datalist id="unit-options">
        {UNITS.map(u => <option key={u} value={u} />)}
      </datalist>

      {ingredients.map((ing, index) => (
        <div key={index} className="flex gap-2 items-center">
          <div className="flex-1">
            <Input
              placeholder="Ingredient (e.g. flour)"
              value={ing.item}
              onChange={e => updateIngredient(index, "item", e.target.value)}
            />
          </div>
          <div className="w-24">
            <Input
              placeholder="Qty"
              value={ing.quantity}
              onChange={e => updateIngredient(index, "quantity", e.target.value)}
            />
          </div>
          <div className="w-28">
            <Input
              placeholder="Unit"
              list="unit-options"
              value={ing.unit}
              onChange={e => updateIngredient(index, "unit", e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeIngredient(index)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Icon name="delete" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addIngredient}
        className="mt-1"
      >
        <Icon name="add" className="mr-1 text-primary" />
        Add ingredient
      </Button>
    </div>
  )
}
