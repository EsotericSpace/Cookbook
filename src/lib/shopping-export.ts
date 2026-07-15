import { formatMixedQuantity } from "./ingredient-merge"
import type { ShoppingList, ShoppingListItem } from "./types"

// Most mail clients start truncating mailto: bodies somewhere around
// 2000 encoded characters; stay well under that before falling back.
const MAILTO_BODY_LIMIT = 1500

export function formatShoppingListText(
  list: ShoppingList,
  aisleGroups: { aisle: string; items: ShoppingListItem[] }[]
): string {
  const lines = [list.name, ""]
  for (const { aisle, items } of aisleGroups) {
    if (items.length === 0) continue
    lines.push(aisle.replace(/\b\w/g, c => c.toUpperCase()))
    for (const item of items) {
      const qty = formatMixedQuantity(item.amount, item.unit)
      lines.push(`- ${[qty, item.name].filter(Boolean).join(" ")}`)
    }
    lines.push("")
  }
  return lines.join("\n").trim()
}

export function slugifyFileName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "shopping-list"
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function emailShoppingList(
  list: ShoppingList,
  text: string
): Promise<"mailto" | "clipboard-fallback"> {
  const subject = encodeURIComponent(list.name)
  const encodedBody = encodeURIComponent(text)

  if (encodedBody.length <= MAILTO_BODY_LIMIT) {
    window.location.href = `mailto:?subject=${subject}&body=${encodedBody}`
    return "mailto"
  }

  await navigator.clipboard.writeText(text)
  const fallbackBody = encodeURIComponent(
    "Your shopping list was too long to include here — paste it from your clipboard."
  )
  window.location.href = `mailto:?subject=${subject}&body=${fallbackBody}`
  return "clipboard-fallback"
}
