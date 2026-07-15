import type { Recipe, Ingredient, Tag } from "./types"

const UNIT_ALIASES: Record<string, string> = {
  cups: "cup",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  pound: "lb",
  pounds: "lb",
  ounce: "oz",
  ounces: "oz",
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  liter: "L",
  liters: "L",
  milliliter: "ml",
  milliliters: "ml",
  pint: "pt",
  pints: "pt",
  quart: "qt",
  quarts: "qt",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
}

const KNOWN_UNITS = [
  "fluid ounces", "fluid ounce",
  "tablespoons", "tablespoon",
  "teaspoons", "teaspoon",
  "kilograms", "kilogram",
  "milliliters", "milliliter",
  "pounds", "pound",
  "ounces", "ounce",
  "grams", "gram",
  "liters", "liter",
  "quarts", "quart",
  "pints", "pint",
  "cups", "cup",
  "fl oz", "tbsp", "tsp",
  "kg", "ml", "lb", "oz",
  "pt", "qt", "g", "L",
  "dash", "pinch",
]

const UNICODE_FRACTIONS: Record<string, string> = {
  "¼": "1/4", "½": "1/2", "¾": "3/4",
  "⅓": "1/3", "⅔": "2/3",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
}

function normalizeUnit(raw: string): string {
  const lower = raw.toLowerCase().trim()
  return UNIT_ALIASES[lower] ?? raw
}

function normalizeFractions(str: string): string {
  return str.replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, c => UNICODE_FRACTIONS[c] ?? c)
}

export function parseIngredientString(raw: string): Ingredient {
  const str = normalizeFractions(raw.trim())

  // Match a leading quantity: integer, decimal, fraction, or range (e.g. 1-2)
  const qtyMatch = str.match(/^(\d+(?:[/\-.]\s*\d+)?(?:\s+\d+\/\d+)?)\s+(.+)/)
  if (!qtyMatch) return { item: str, quantity: "", unit: "" }

  const quantity = qtyMatch[1].trim()
  const rest = qtyMatch[2].trim()

  for (const u of KNOWN_UNITS) {
    const pattern = new RegExp(`^${u.replace(/\s+/, "\\s+")}s?\\b\\.?\\s*`, "i")
    const unitMatch = rest.match(pattern)
    if (unitMatch) {
      const item = rest.slice(unitMatch[0].length).replace(/^of\s+/i, "").trim()
      return { item, quantity, unit: normalizeUnit(u) }
    }
  }

  return { item: rest, quantity, unit: "" }
}

function parseDuration(iso?: string): string | undefined {
  if (!iso) return undefined
  const m = iso.match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?|(?:(\d+)H)?(?:(\d+)M)?)/)
  if (!m) return undefined
  const hours = parseInt(m[1] ?? m[3] ?? "0")
  const minutes = parseInt(m[2] ?? m[4] ?? "0")
  if (hours === 0 && minutes === 0) return undefined
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} hr`
  return `${hours} hr ${minutes} min`
}

function parseServings(raw?: string | number | string[]): number | undefined {
  if (raw == null) return undefined
  const str = Array.isArray(raw) ? raw[0] : String(raw)
  const m = str.match(/\d+/)
  return m ? parseInt(m[0]) : undefined
}

function extractImageUrl(raw: unknown): string | undefined {
  if (!raw) return undefined
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first === "string") return first.trim() || undefined
  if (first && typeof first === "object") {
    const url = (first as Record<string, unknown>).url
    if (typeof url === "string") return url.trim() || undefined
  }
  return undefined
}

function extractSchema(html: string): Record<string, unknown> | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const json = JSON.parse(m[1])
      const items: unknown[] = json["@graph"] ? json["@graph"] : [json]
      for (const item of items) {
        const t = (item as Record<string, unknown>)["@type"]
        if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) {
          return item as Record<string, unknown>
        }
      }
    } catch {
      // malformed JSON-LD, skip
    }
  }
  return null
}

function schemaToRecipe(s: Record<string, unknown>): Partial<Recipe> {
  const ingredients: Ingredient[] = ((s.recipeIngredient as string[]) ?? [])
    .map(parseIngredientString)
    .filter(i => i.item)

  const steps: string[] = []
  for (const instr of (s.recipeInstructions as unknown[]) ?? []) {
    if (typeof instr === "string") {
      steps.push(instr.trim())
    } else {
      const obj = instr as Record<string, unknown>
      if (obj["@type"] === "HowToStep") {
        const text = (obj.text ?? obj.name ?? "") as string
        if (text.trim()) steps.push(text.trim())
      } else if (obj["@type"] === "HowToSection") {
        for (const sub of (obj.itemListElement as Record<string, unknown>[]) ?? []) {
          const text = (sub.text ?? sub.name ?? "") as string
          if (text.trim()) steps.push(text.trim())
        }
      }
    }
  }

  const tags: Tag[] = []
  const addTag = (category: Tag["category"], value: unknown) => {
    const v = String(value ?? "").trim()
    if (v) tags.push({ category, value: v })
  }
  // Sites often pack several values into one comma-joined string (e.g.
  // recipeCategory: "Breakfast, Brunch") instead of a proper array — split those apart.
  const toArr = (v: unknown): unknown[] => {
    const arr = Array.isArray(v) ? v : v ? [v] : []
    return arr.flatMap(item => typeof item === "string" ? item.split(/,\s*/) : [item])
  }
  toArr(s.recipeCuisine).forEach((c: unknown) => addTag("cuisine", c))
  toArr(s.recipeCategory).forEach((c: unknown) => addTag("meal", c))
  toArr(s.keywords).slice(0, 3).forEach((k: unknown) => addTag("custom", k))

  return {
    title: (s.name as string) ?? "",
    source: (s.url as string) ?? (s["@id"] as string) ?? "",
    prepTime: parseDuration(s.prepTime as string),
    cookTime: parseDuration(s.cookTime as string),
    servings: parseServings(s.recipeYield as string),
    imageUrl: extractImageUrl(s.image),
    ingredients,
    steps,
    tags,
    notes: (s.description as string) ?? "",
  }
}

export async function importRecipeFromUrl(url: string): Promise<Partial<Recipe>> {
  // corsproxy.io's free tier only serves localhost/dev origins — in
  // production, fetch server-side via our own function instead, which
  // sidesteps CORS entirely since it's not a browser request.
  const fetchUrl = import.meta.env.DEV
    ? `https://corsproxy.io/?${encodeURIComponent(url)}`
    : `/api/scrape?url=${encodeURIComponent(url)}`
  const res = await fetch(fetchUrl)
  if (!res.ok) throw new Error(`Could not fetch URL (${res.status})`)
  const html = await res.text()
  const schema = extractSchema(html)
  if (!schema) {
    throw new Error(
      "No structured recipe data found on this page. Try copying the recipe manually."
    )
  }
  return schemaToRecipe(schema)
}
