import type { Ingredient, ShoppingListItem } from "./types"
import { assignAisle } from "./aisle-map"

export function parseQuantity(qty: string): number {
  const trimmed = qty?.trim() ?? ""
  if (!trimmed) return 0
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3])
  const frac = trimmed.match(/^(\d+)\/(\d+)$/)
  if (frac) return parseInt(frac[1]) / parseInt(frac[2])
  const n = parseFloat(trimmed)
  return isNaN(n) ? 0 : n
}

export function formatQuantity(amount: number): string {
  if (amount <= 0) return ""
  const whole = Math.floor(amount)
  const frac = amount - whole
  const FRACS: [number, string][] = [
    [3 / 4, "3/4"], [2 / 3, "2/3"], [1 / 2, "1/2"], [1 / 3, "1/3"], [1 / 4, "1/4"],
  ]
  for (const [val, str] of FRACS) {
    if (Math.abs(frac - val) < 0.04) {
      return whole > 0 ? `${whole} ${str}` : str
    }
  }
  if (frac < 0.04) return String(whole)
  return amount % 1 === 0 ? String(whole) : amount.toFixed(1).replace(/\.0$/, "")
}

type UnitFamily = "volume" | "weight" | "other"

const VOLUME_TO_TSP: Record<string, number> = {
  tsp: 1, teaspoon: 1, teaspoons: 1,
  tbsp: 3, tablespoon: 3, tablespoons: 3,
  "fl oz": 6,
  cup: 48, cups: 48,
  pt: 96, pint: 96, pints: 96,
  qt: 192, quart: 192, quarts: 192,
  L: 202, l: 202, liter: 202, liters: 202,
  ml: 0.202, milliliter: 0.202, milliliters: 0.202,
}

const WEIGHT_TO_OZ: Record<string, number> = {
  oz: 1, ounce: 1, ounces: 1,
  lb: 16, lbs: 16, pound: 16, pounds: 16,
  g: 0.0353, gram: 0.0353, grams: 0.0353,
  kg: 35.3, kilogram: 35.3, kilograms: 35.3,
}

function unitFamily(unit: string | null): UnitFamily {
  if (!unit) return "other"
  const u = unit.toLowerCase()
  if (VOLUME_TO_TSP[u] != null) return "volume"
  if (WEIGHT_TO_OZ[u] != null) return "weight"
  return "other"
}

function toBase(amount: number, unit: string, family: UnitFamily): number {
  const u = unit.toLowerCase()
  if (family === "volume") return amount * (VOLUME_TO_TSP[u] ?? 1)
  if (family === "weight") return amount * (WEIGHT_TO_OZ[u] ?? 1)
  return amount
}

function formatMixedVolume(totalTsp: number): string {
  if (totalTsp <= 1e-6) return ""
  let remaining = totalTsp
  const parts: string[] = []

  const qtCount = Math.floor(remaining / 192 + 1e-6)
  if (qtCount > 0) {
    parts.push(`${formatQuantity(qtCount)} qt`)
    remaining -= qtCount * 192
  }

  // Cups are commonly measured in quarter increments (matches measuring cup markings)
  const cupCount = Math.floor(remaining / 48 / 0.25 + 1e-6) * 0.25
  if (cupCount > 0) {
    parts.push(`${formatQuantity(cupCount)} cup`)
    remaining -= cupCount * 48
  }

  const tbspCount = Math.floor(remaining / 3 + 1e-6)
  if (tbspCount > 0) {
    parts.push(`${formatQuantity(tbspCount)} tbsp`)
    remaining -= tbspCount * 3
  }

  if (remaining > 1e-6) {
    parts.push(`${formatQuantity(remaining)} tsp`)
  }

  return parts.join(" + ")
}

export function formatMixedQuantity(amount: number, unit: string | null): string {
  if (amount <= 0) return ""
  const family = unitFamily(unit)
  if (family === "volume" && unit) {
    const mixed = formatMixedVolume(toBase(amount, unit, family))
    if (mixed) return mixed
  }
  return [formatQuantity(amount), unit].filter(Boolean).join(" ")
}

function fromBase(base: number, family: UnitFamily): { amount: number; unit: string } {
  if (family === "volume") {
    if (base >= 192) return { amount: base / 192, unit: "qt" }
    if (base >= 48) return { amount: base / 48, unit: "cup" }
    if (base >= 3) return { amount: base / 3, unit: "tbsp" }
    return { amount: base, unit: "tsp" }
  }
  if (family === "weight") {
    if (base >= 16) return { amount: base / 16, unit: "lb" }
    return { amount: base, unit: "oz" }
  }
  return { amount: base, unit: "" }
}

function mergeKey(item: string, unit: string | null): string {
  return `${item.toLowerCase().trim()}__${unitFamily(unit)}`
}

export function mergeIngredients(
  ingredientSets: Array<{ recipeId: string; ingredients: Ingredient[] }>
): ShoppingListItem[] {
  const buckets = new Map<string, {
    name: string
    baseTotalAmount: number
    family: UnitFamily
    representativeUnit: string | null
    sourceRecipeIds: string[]
  }>()

  for (const { recipeId, ingredients } of ingredientSets) {
    for (const ing of ingredients) {
      if (!ing.item.trim()) continue
      const family = unitFamily(ing.unit || null)
      const key = mergeKey(ing.item, ing.unit || null)
      const qty = parseQuantity(ing.quantity)
      const base = ing.unit ? toBase(qty, ing.unit, family) : qty

      if (buckets.has(key)) {
        const b = buckets.get(key)!
        b.baseTotalAmount += base
        if (!b.sourceRecipeIds.includes(recipeId)) b.sourceRecipeIds.push(recipeId)
      } else {
        buckets.set(key, {
          name: ing.item,
          baseTotalAmount: base,
          family,
          representativeUnit: ing.unit || null,
          sourceRecipeIds: [recipeId],
        })
      }
    }
  }

  return Array.from(buckets.values()).map(b => {
    let amount: number
    let unit: string | null

    if (b.family !== "other" && b.representativeUnit) {
      const result = fromBase(b.baseTotalAmount, b.family)
      amount = result.amount
      unit = result.unit || null
    } else {
      amount = b.baseTotalAmount
      unit = b.representativeUnit
    }

    return {
      id: crypto.randomUUID(),
      name: b.name,
      amount,
      unit,
      sourceRecipeIds: b.sourceRecipeIds,
      aisle: assignAisle(b.name),
    }
  })
}
