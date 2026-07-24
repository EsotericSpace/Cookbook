import { MEAL_OCCASIONS, type Recipe, type Ingredient, type IngredientSection, type StepSection, type Tag } from "./types"

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

// Some sites embed a redundant literal label as the first ingredient/
// instruction line (e.g. "Ingredients:") — skip treating those as a
// section header since they'd just duplicate the page's own heading.
const SECTION_TITLE_DENYLIST = new Set(["ingredients", "instructions", "steps"])

// Recognizes group-header lines within a flat recipeIngredient array (e.g.
// "For the icing:") — schema.org has no standard way to mark these, so
// sites bake them into the ingredient list as plain, quantity-less text.
function isHeaderShapedLine(trimmed: string): boolean {
  if (!trimmed || /^\d/.test(trimmed)) return false
  return /:$/.test(trimmed) || (/^for\s+the\s+/i.test(trimmed) && trimmed.length < 40)
}

function ingredientHeaderTitle(trimmed: string): string | null {
  const title = trimmed.replace(/:$/, "").replace(/^for\s+the\s+/i, "").trim()
  if (!title || SECTION_TITLE_DENYLIST.has(title.toLowerCase())) return null
  return title
}

function buildIngredientSections(lines: string[]): IngredientSection[] {
  const sections: IngredientSection[] = []
  let current: IngredientSection = { items: [] }
  const flush = () => { if (current.items.length > 0) sections.push(current) }

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (isHeaderShapedLine(trimmed)) {
      const header = ingredientHeaderTitle(trimmed)
      if (header) {
        flush()
        current = { title: header, items: [] }
      }
      // Header-shaped but denylisted (e.g. a redundant "Ingredients:" label)
      // — drop the line entirely rather than parsing it as an ingredient.
      continue
    }
    const ing = parseIngredientString(raw)
    if (ing.item) current.items.push(ing)
  }
  flush()
  return sections
}

function buildStepSections(instructions: unknown[]): StepSection[] {
  const sections: StepSection[] = []
  let current: StepSection = { items: [] }
  function flushCurrent() {
    if (current.items.length > 0) sections.push(current)
    current = { items: [] }
  }

  for (const instr of instructions) {
    if (typeof instr === "string") {
      const text = instr.trim()
      if (text) current.items.push(text)
      continue
    }
    const obj = instr as Record<string, unknown>
    if (obj["@type"] === "HowToStep") {
      const text = (obj.text ?? obj.name ?? "") as string
      if (text.trim()) current.items.push(text.trim())
    } else if (obj["@type"] === "HowToSection") {
      flushCurrent()
      const title = typeof obj.name === "string" ? obj.name.trim() : ""
      const items: string[] = []
      for (const sub of (obj.itemListElement as Record<string, unknown>[]) ?? []) {
        const text = (sub.text ?? sub.name ?? "") as string
        if (text.trim()) items.push(text.trim())
      }
      if (items.length > 0) sections.push({ title: title || undefined, items })
    }
  }
  flushCurrent()
  return sections
}

// schema.org allows recipeIngredient/recipeInstructions to be a single value
// instead of a list (e.g. a lone HowToStep object for a one-step recipe) —
// normalize to an array so buildIngredientSections/buildStepSections always
// get something iterable.
function ensureArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v ? [v] : []
}

function schemaToRecipe(s: Record<string, unknown>): Partial<Recipe> {
  const ingredients = buildIngredientSections(ensureArray(s.recipeIngredient) as string[])
  const steps = buildStepSections(ensureArray(s.recipeInstructions))

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
  // Sites free-type recipeCategory (e.g. "Main Course", "Weeknight Dinners")
  // rather than sticking to a fixed vocabulary — only keep values that map
  // onto our standard meal-occasion list, dropping the rest, so imports
  // don't reintroduce the tag sprawl we're trying to clean up.
  toArr(s.recipeCategory).forEach((c: unknown) => {
    const raw = String(c ?? "").trim()
    const matched = MEAL_OCCASIONS.find(o => o.toLowerCase() === raw.toLowerCase())
    if (matched) addTag("meal", matched)
  })

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

// Some sites (e.g. NYT Cooking) display prep/cook time on the page but
// leave them null in their JSON-LD Recipe schema. Fall back to scraping the
// visible <dt>label</dt><dd>value</dd> stat pair by label text — more
// fragile than the structured-data path (breaks if the site's markup
// changes), so it's only used when JSON-LD didn't give us an answer.
function extractLabeledTime(html: string, label: string): string | undefined {
  const re = new RegExp(`<dt[^>]*>\\s*${label}\\s*</dt>\\s*<dd[^>]*>([^<]+)</dd>`, "i")
  return html.match(re)?.[1]?.trim()
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
  const recipe = schemaToRecipe(schema)
  if (!recipe.prepTime) recipe.prepTime = extractLabeledTime(html, "Prep Time")
  if (!recipe.cookTime) recipe.cookTime = extractLabeledTime(html, "Cook Time")
  return recipe
}
