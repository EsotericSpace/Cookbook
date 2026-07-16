import type React from "react"
import type { TagCategory } from "./types"

// ---------------------------------------------------------------------------
// Color palette — each entry carries Tailwind classes (with dark-mode
// variants) and hex (for reference). Gradient blending uses the --grad-*
// oklch custom properties defined in index.css (light + dark values) so the
// meal-tag gradient header repaints automatically when the theme toggles.
// ---------------------------------------------------------------------------

export const COLOR_PALETTE = {
  amber:  { bg: "bg-amber-100 dark:bg-amber-950/40",  hex: "#fef3c7", labelText: "text-amber-700 dark:text-amber-300",  titleText: "text-amber-900 dark:text-amber-100",  dot: "bg-amber-400"  },
  teal:   { bg: "bg-teal-100 dark:bg-teal-950/40",    hex: "#ccfbf1", labelText: "text-teal-700 dark:text-teal-300",    titleText: "text-teal-900 dark:text-teal-100",    dot: "bg-teal-400"   },
  orange: { bg: "bg-orange-100 dark:bg-orange-950/40",hex: "#ffedd5", labelText: "text-orange-700 dark:text-orange-300",titleText: "text-orange-900 dark:text-orange-100",dot: "bg-orange-400" },
  purple: { bg: "bg-purple-100 dark:bg-purple-950/40",hex: "#f3e8ff", labelText: "text-purple-700 dark:text-purple-300",titleText: "text-purple-900 dark:text-purple-100",dot: "bg-purple-400" },
  pink:   { bg: "bg-pink-100 dark:bg-pink-950/40",    hex: "#fce7f3", labelText: "text-pink-700 dark:text-pink-300",    titleText: "text-pink-900 dark:text-pink-100",    dot: "bg-pink-400"   },
  blue:   { bg: "bg-blue-100 dark:bg-blue-950/40",    hex: "#dbeafe", labelText: "text-blue-700 dark:text-blue-300",    titleText: "text-blue-900 dark:text-blue-100",    dot: "bg-blue-400"   },
  green:  { bg: "bg-green-100 dark:bg-green-950/40",  hex: "#dcfce7", labelText: "text-green-700 dark:text-green-300",  titleText: "text-green-900 dark:text-green-100",  dot: "bg-green-400"  },
  red:    { bg: "bg-red-100 dark:bg-red-950/40",      hex: "#fee2e2", labelText: "text-red-700 dark:text-red-300",      titleText: "text-red-900 dark:text-red-100",      dot: "bg-red-400"    },
  stone:  { bg: "bg-stone-100 dark:bg-stone-800/60",  hex: "#f5f5f4", labelText: "text-stone-600 dark:text-stone-300",  titleText: "text-stone-800 dark:text-stone-100",  dot: "bg-stone-400"  },
  cyan:   { bg: "bg-cyan-100 dark:bg-cyan-950/40",    hex: "#cffafe", labelText: "text-cyan-700 dark:text-cyan-300",    titleText: "text-cyan-900 dark:text-cyan-100",    dot: "bg-cyan-400"   },
} as const

export type ColorKey = keyof typeof COLOR_PALETTE
export type PaletteEntry = typeof COLOR_PALETTE[ColorKey]

function resolveColorKey(colorKey: string): ColorKey {
  return (colorKey in COLOR_PALETTE ? colorKey : "stone") as ColorKey
}

export function getHeaderColors(colorKey: string): PaletteEntry {
  return COLOR_PALETTE[resolveColorKey(colorKey)]
}

// Gradient stops reference CSS custom properties (see index.css) so the
// gradient stays bright/saturated and repaints for the active theme.
export function mealGradientStyle(colorKeys: string[]): React.CSSProperties | undefined {
  if (colorKeys.length < 2) return undefined
  const stops = colorKeys.map(k => `var(--grad-${resolveColorKey(k)})`).join(", ")
  return { background: `linear-gradient(to right in oklch, ${stops})` }
}

// ---------------------------------------------------------------------------
// Static badge colors for non-meal categories (not user-configurable)
// ---------------------------------------------------------------------------

const TAG_BADGE_COLORS: Record<TagCategory, string> = {
  meal:     "bg-amber-100  text-amber-800  border-amber-200  dark:bg-amber-950/40  dark:text-amber-300  dark:border-amber-800/60",
  dishType: "bg-blue-100   text-blue-800   border-blue-200   dark:bg-blue-950/40   dark:text-blue-300   dark:border-blue-800/60",
  cuisine:  "bg-teal-100   text-teal-800   border-teal-200   dark:bg-teal-950/40   dark:text-teal-300   dark:border-teal-800/60",
  protein:  "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60",
  effort:   "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
  diet:     "bg-green-100  text-green-800  border-green-200  dark:bg-green-950/40  dark:text-green-300  dark:border-green-800/60",
}

// Fallback for any tag category not in the fixed set above (e.g. stale data
// from before "custom" was removed as a category).
const DEFAULT_BADGE_COLOR = "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700"

export function tagCategoryColor(category: string): string {
  return TAG_BADGE_COLORS[category as TagCategory] ?? DEFAULT_BADGE_COLOR
}

// ---------------------------------------------------------------------------
// Time utilities
// ---------------------------------------------------------------------------

export function parseMinutes(str?: string): number | null {
  if (!str) return null
  const hr  = str.match(/(\d+)\s*hr/)
  const min = str.match(/(\d+)\s*min/)
  const total = (hr ? parseInt(hr[1]) * 60 : 0) + (min ? parseInt(min[1]) : 0)
  return total > 0 ? total : null
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
