import { toast } from "sonner"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import type { Recipe, TagRegistryEntry, ShoppingList, ShoppingListItem, Ingredient, Tag, Profile } from "./types"
import { mergeIngredients } from "./ingredient-merge"
import { assignAisle } from "./aisle-map"
import { supabase } from "./supabaseClient"
import { getCurrentUserId, getCurrentUserEmail } from "./auth"

// ---------------------------------------------------------------------------
// Write-through in-memory cache, backed by a shared Supabase database.
//
// Every exported read function returns synchronously from these module-level
// caches — components read them directly (some in render bodies) and rely on
// a `subscribe()`/re-render cycle (see Phase 3 / useSyncExternalStore) to
// pick up changes, whether from this device's own writes or from another
// signed-in user's writes arriving over Supabase Realtime.
// ---------------------------------------------------------------------------

let recipesCache: Recipe[] = []
let recipesById = new Map<string, Recipe>()
let shoppingListsCache: ShoppingList[] = []
let tagRegistryCache: TagRegistryEntry[] = []
let profilesCache: Profile[] = []

const listeners = new Set<() => void>()
let version = 0
function notify() {
  version++
  listeners.forEach(l => l())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// A page can read one specific collection (e.g. getRecipes) via
// useSyncExternalStore for its own data, but a child component elsewhere in
// its tree might independently read a *different* collection (e.g.
// RecipeDetail reading getShoppingLists for its "Add to list" dropdown).
// That child only gets fresh data on the page's next render, and the page
// itself only re-renders when its own subscribed snapshot changes — so
// pages should also subscribe to this version counter, which changes on
// every storage mutation regardless of which collection it touched.
export function getVersion(): number {
  return version
}

function setRecipesCache(recipes: Recipe[]): void {
  recipesCache = recipes
  recipesById = new Map(recipes.map(r => [r.id, r]))
}

function upsertById<T extends { id: string }>(arr: T[], item: T): T[] {
  const idx = arr.findIndex(x => x.id === item.id)
  if (idx === -1) return [...arr, item]
  const next = [...arr]
  next[idx] = item
  return next
}

function persistFailure(message: string) {
  return (err: unknown) => {
    console.error(message, err)
    toast.error(message)
  }
}

// ---------------------------------------------------------------------------
// DB row <-> app-type mapping (Postgres columns are snake_case; the app's
// types stay camelCase throughout).
// ---------------------------------------------------------------------------

interface RecipeRow {
  id: string
  user_id: string
  title: string
  source: string | null
  prep_time: string | null
  cook_time: string | null
  servings: number | null
  image_url: string | null
  ingredients: Ingredient[]
  steps: string[]
  tags: Tag[]
  notes: string | null
  created_at: string
  updated_at: string
}

function fromRecipeRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    source: row.source ?? undefined,
    prepTime: row.prep_time ?? undefined,
    cookTime: row.cook_time ?? undefined,
    servings: row.servings ?? undefined,
    imageUrl: row.image_url ?? undefined,
    ingredients: row.ingredients,
    steps: row.steps,
    tags: row.tags,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRecipeRow(recipe: Recipe): RecipeRow {
  return {
    id: recipe.id,
    user_id: recipe.userId,
    title: recipe.title,
    source: recipe.source ?? null,
    prep_time: recipe.prepTime ?? null,
    cook_time: recipe.cookTime ?? null,
    servings: recipe.servings ?? null,
    image_url: recipe.imageUrl ?? null,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    tags: recipe.tags,
    notes: recipe.notes ?? null,
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt,
  }
}

interface ShoppingListRow {
  id: string
  user_id: string
  name: string
  source_recipe_ids: string[]
  items: ShoppingListItem[]
  created_at: string
  updated_at: string
}

function fromShoppingListRow(row: ShoppingListRow): ShoppingList {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    sourceRecipeIds: row.source_recipe_ids,
    items: row.items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toShoppingListRow(list: ShoppingList): ShoppingListRow {
  return {
    id: list.id,
    user_id: list.userId,
    name: list.name,
    source_recipe_ids: list.sourceRecipeIds,
    items: list.items,
    created_at: list.createdAt,
    updated_at: list.updatedAt,
  }
}

interface TagRegistryRow {
  id: string
  created_by: string
  category: string
  value: string
  color_key: string
}

function fromTagRow(row: TagRegistryRow): TagRegistryEntry {
  return { id: row.id, createdBy: row.created_by, category: row.category, value: row.value, colorKey: row.color_key }
}

function toTagRow(entry: TagRegistryEntry): TagRegistryRow {
  return { id: entry.id, created_by: entry.createdBy, category: entry.category, value: entry.value, color_key: entry.colorKey }
}

interface ProfileRow {
  id: string
  display_name: string
  is_admin: boolean
}

function fromProfileRow(row: ProfileRow): Profile {
  return { id: row.id, displayName: row.display_name, isAdmin: row.is_admin }
}

function toProfileRow(profile: Profile): ProfileRow {
  return { id: profile.id, display_name: profile.displayName, is_admin: profile.isAdmin }
}

// ---------------------------------------------------------------------------
// Shape validation. jsonb columns have no schema of their own, and with
// multiple writers a malformed row could break rendering for every reader —
// not a risk this app had with a single local writer.
// ---------------------------------------------------------------------------

function isIngredient(v: unknown): v is Ingredient {
  const i = v as Ingredient
  return !!i && typeof i === "object" && typeof i.item === "string" && typeof i.quantity === "string" && typeof i.unit === "string"
}

function isTag(v: unknown): v is Tag {
  const t = v as Tag
  return !!t && typeof t === "object" && typeof t.category === "string" && typeof t.value === "string"
}

function validateRecipeShape(recipe: Recipe): void {
  if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.every(isIngredient)) {
    throw new Error("Recipe has invalid ingredients")
  }
  if (!Array.isArray(recipe.steps) || !recipe.steps.every(s => typeof s === "string")) {
    throw new Error("Recipe has invalid steps")
  }
  if (!Array.isArray(recipe.tags) || !recipe.tags.every(isTag)) {
    throw new Error("Recipe has invalid tags")
  }
}

// ---------------------------------------------------------------------------
// Initialization + realtime
// ---------------------------------------------------------------------------

let initPromise: Promise<void> | null = null
let initialLoadComplete = false
let pendingRealtimeEvents: Array<() => void> = []
let hasSubscribedOnce = false

export function initializeStorage(): Promise<void> {
  if (!initPromise) initPromise = doInitialize()
  return initPromise
}

async function doInitialize(): Promise<void> {
  // Subscribe before the initial fetch so a change landing in the gap
  // between "start listening" and "finish fetching" isn't silently missed —
  // events that arrive before the initial snapshot lands are queued and
  // replayed on top of it below.
  subscribeToRealtime()
  await refetchAll()
  await ensureProfileExists()
  initialLoadComplete = true
  const queued = pendingRealtimeEvents
  pendingRealtimeEvents = []
  queued.forEach(apply => apply())
  notify()
}

// Guarantees a profile row for the current user. New signups get one
// automatically via a DB trigger, but that trigger only fires for brand-new
// auth.users rows — anyone who signed up before the profiles table existed
// needs one created lazily here on their next visit.
async function ensureProfileExists(): Promise<void> {
  const userId = getCurrentUserId()
  if (!userId || profilesCache.some(p => p.id === userId)) return
  const email = getCurrentUserEmail()
  const profile: Profile = { id: userId, displayName: email?.split("@")[0] ?? "cook", isAdmin: false }
  profilesCache = [...profilesCache, profile]
  notify()
  const { error } = await supabase.from("profiles").upsert(toProfileRow(profile))
  if (error) console.error("Failed to create profile", error)
}

async function refetchAll(): Promise<void> {
  const [recipesRes, listsRes, tagsRes, profilesRes] = await Promise.all([
    supabase.from("recipes").select("*"),
    supabase.from("shopping_lists").select("*"),
    supabase.from("tag_registry").select("*"),
    supabase.from("profiles").select("*"),
  ])
  if (recipesRes.error) console.error("Failed to load recipes", recipesRes.error)
  if (listsRes.error) console.error("Failed to load shopping lists", listsRes.error)
  if (tagsRes.error) console.error("Failed to load tags", tagsRes.error)
  if (profilesRes.error) console.error("Failed to load profiles", profilesRes.error)

  setRecipesCache(((recipesRes.data as RecipeRow[] | null) ?? []).map(fromRecipeRow))
  shoppingListsCache = ((listsRes.data as ShoppingListRow[] | null) ?? []).map(fromShoppingListRow)
  tagRegistryCache = ((tagsRes.data as TagRegistryRow[] | null) ?? []).map(fromTagRow)
  profilesCache = ((profilesRes.data as ProfileRow[] | null) ?? []).map(fromProfileRow)
  notify()
}

function applyRealtimeChange(fn: () => void): void {
  if (initialLoadComplete) {
    fn()
    notify()
  } else {
    pendingRealtimeEvents.push(fn)
  }
}

function subscribeToRealtime(): void {
  supabase
    .channel("cookbook-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "recipes" },
      (payload: RealtimePostgresChangesPayload<RecipeRow>) => applyRealtimeChange(() => {
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as Partial<RecipeRow>).id
          if (oldId) setRecipesCache(recipesCache.filter(r => r.id !== oldId))
          return
        }
        const incoming = fromRecipeRow(payload.new as RecipeRow)
        const existing = recipesById.get(incoming.id)
        if (existing && existing.updatedAt >= incoming.updatedAt) return // last-write-wins guard
        setRecipesCache(upsertById(recipesCache, incoming))
      })
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shopping_lists" },
      (payload: RealtimePostgresChangesPayload<ShoppingListRow>) => applyRealtimeChange(() => {
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as Partial<ShoppingListRow>).id
          if (oldId) shoppingListsCache = shoppingListsCache.filter(l => l.id !== oldId)
          return
        }
        const incoming = fromShoppingListRow(payload.new as ShoppingListRow)
        const existing = shoppingListsCache.find(l => l.id === incoming.id)
        if (existing && existing.updatedAt >= incoming.updatedAt) return
        shoppingListsCache = upsertById(shoppingListsCache, incoming)
      })
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tag_registry" },
      (payload: RealtimePostgresChangesPayload<TagRegistryRow>) => applyRealtimeChange(() => {
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as Partial<TagRegistryRow>).id
          if (oldId) tagRegistryCache = tagRegistryCache.filter(t => t.id !== oldId)
          return
        }
        tagRegistryCache = upsertById(tagRegistryCache, fromTagRow(payload.new as TagRegistryRow))
      })
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles" },
      (payload: RealtimePostgresChangesPayload<ProfileRow>) => applyRealtimeChange(() => {
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as Partial<ProfileRow>).id
          if (oldId) profilesCache = profilesCache.filter(p => p.id !== oldId)
          return
        }
        profilesCache = upsertById(profilesCache, fromProfileRow(payload.new as ProfileRow))
      })
    )
    .subscribe(status => {
      if (status === "SUBSCRIBED") {
        // Realtime doesn't guarantee delivery of events missed while
        // disconnected, so a reconnect (tab sleep, network blip) triggers a
        // full re-fetch rather than trusting the stream picked up cleanly.
        if (hasSubscribedOnce) void refetchAll()
        hasSubscribedOnce = true
      }
    })
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export function getRecipes(): Recipe[] {
  return recipesCache
}

export function addRecipe(recipe: Recipe): void {
  validateRecipeShape(recipe)
  const previous = recipesCache
  setRecipesCache([...recipesCache, recipe])
  notify()
  void supabase.from("recipes").insert(toRecipeRow(recipe)).then(({ error }) => {
    if (error) {
      setRecipesCache(previous)
      notify()
      persistFailure("Failed to save recipe")(error)
    }
  })
}

export function updateRecipe(id: string, updates: Partial<Recipe>): void {
  const existing = recipesById.get(id)
  if (!existing) return
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
  validateRecipeShape(updated)
  const previous = recipesCache
  setRecipesCache(recipesCache.map(r => r.id === id ? updated : r))
  notify()
  void supabase.from("recipes").update(toRecipeRow(updated)).eq("id", id).then(({ error }) => {
    if (error) {
      setRecipesCache(previous)
      notify()
      persistFailure("Failed to save recipe")(error)
    }
  })
}

export function deleteRecipe(id: string): void {
  const previous = recipesCache
  setRecipesCache(recipesCache.filter(r => r.id !== id))
  notify()
  void supabase.from("recipes").delete().eq("id", id).then(({ error }) => {
    if (error) {
      setRecipesCache(previous)
      notify()
      persistFailure("Failed to delete recipe")(error)
    }
  })
}

// Memoized against the recipesCache array reference — recomputing a fresh
// object on every call would break useSyncExternalStore's snapshot-stability
// requirement (its getSnapshot must return a referentially stable value
// when nothing has changed, or React re-renders in a loop).
let allTagsCache: Record<string, string[]> | null = null
let allTagsCacheFor: Recipe[] | null = null

export function getAllTags(): Record<string, string[]> {
  if (allTagsCacheFor === recipesCache && allTagsCache) return allTagsCache
  const map: Record<string, Set<string>> = {}
  for (const recipe of recipesCache) {
    for (const tag of recipe.tags) {
      if (!map[tag.category]) map[tag.category] = new Set()
      map[tag.category].add(tag.value)
    }
  }
  allTagsCache = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Array.from(v).sort()]))
  allTagsCacheFor = recipesCache
  return allTagsCache
}

// ---------------------------------------------------------------------------
// Tag registry
// ---------------------------------------------------------------------------

export function getTagRegistry(): TagRegistryEntry[] {
  return tagRegistryCache
}

export function registerTag(category: string, value: string, colorKey: string): TagRegistryEntry {
  const userId = getCurrentUserId()
  if (!userId) throw new Error("Must be signed in to add a tag")
  const entry: TagRegistryEntry = { id: crypto.randomUUID(), createdBy: userId, category, value, colorKey }
  const previous = tagRegistryCache
  tagRegistryCache = [...tagRegistryCache, entry]
  notify()
  void supabase.from("tag_registry").insert(toTagRow(entry)).then(({ error }) => {
    if (error) {
      tagRegistryCache = previous
      notify()
      persistFailure("Failed to save tag")(error)
    }
  })
  return entry
}

export function updateTagColor(id: string, colorKey: string): void {
  const existing = tagRegistryCache.find(e => e.id === id)
  if (!existing) return
  const updated = { ...existing, colorKey }
  const previous = tagRegistryCache
  tagRegistryCache = tagRegistryCache.map(e => e.id === id ? updated : e)
  notify()
  void supabase.from("tag_registry").update(toTagRow(updated)).eq("id", id).then(({ error }) => {
    if (error) {
      tagRegistryCache = previous
      notify()
      persistFailure("Failed to save tag")(error)
    }
  })
}

export function getTagColor(category: string, value: string): string | null {
  const entry = tagRegistryCache.find(
    e => e.category === category && e.value.toLowerCase() === value.toLowerCase()
  )
  return entry?.colorKey ?? null
}

// ---------------------------------------------------------------------------
// Shopping lists
// ---------------------------------------------------------------------------

export function getShoppingLists(): ShoppingList[] {
  return shoppingListsCache
}

function putShoppingList(list: ShoppingList, previous: ShoppingList[]): void {
  void supabase.from("shopping_lists").upsert(toShoppingListRow(list)).then(({ error }) => {
    if (error) {
      shoppingListsCache = previous
      notify()
      persistFailure("Failed to save shopping list")(error)
    }
  })
}

export function createShoppingList(name: string, recipeIds: string[]): ShoppingList {
  const userId = getCurrentUserId()
  if (!userId) throw new Error("Must be signed in to create a shopping list")
  const ingredientSets = recipeIds.map(id => ({
    recipeId: id,
    ingredients: recipesById.get(id)?.ingredients ?? [],
  }))
  const items = mergeIngredients(ingredientSets)
  const now = new Date().toISOString()
  const list: ShoppingList = {
    id: crypto.randomUUID(),
    userId,
    name,
    createdAt: now,
    updatedAt: now,
    sourceRecipeIds: recipeIds,
    items,
  }
  const previous = shoppingListsCache
  shoppingListsCache = [...shoppingListsCache, list]
  notify()
  putShoppingList(list, previous)
  return list
}

export function addRecipeToShoppingList(listId: string, recipeId: string): void {
  const list = shoppingListsCache.find(l => l.id === listId)
  if (!list || list.sourceRecipeIds.includes(recipeId)) return
  const allRecipeIds = [...list.sourceRecipeIds, recipeId]
  const ingredientSets = allRecipeIds.map(id => ({
    recipeId: id,
    ingredients: recipesById.get(id)?.ingredients ?? [],
  }))
  const updatedItems = mergeIngredients(ingredientSets)
  const previous = shoppingListsCache
  const updated: ShoppingList = {
    ...list,
    sourceRecipeIds: allRecipeIds,
    items: updatedItems,
    updatedAt: new Date().toISOString(),
  }
  shoppingListsCache = shoppingListsCache.map(l => l.id === listId ? updated : l)
  notify()
  putShoppingList(updated, previous)
}

export function removeRecipeFromShoppingList(listId: string, recipeId: string): void {
  const list = shoppingListsCache.find(l => l.id === listId)
  if (!list) return
  const remainingRecipeIds = list.sourceRecipeIds.filter(id => id !== recipeId)
  const ingredientSets = remainingRecipeIds.map(id => ({
    recipeId: id,
    ingredients: recipesById.get(id)?.ingredients ?? [],
  }))
  const freshItems = mergeIngredients(ingredientSets)
  const freeformItems = list.items.filter(i => i.sourceRecipeIds.length === 0)
  const previous = shoppingListsCache
  const updated: ShoppingList = {
    ...list,
    sourceRecipeIds: remainingRecipeIds,
    items: [...freshItems, ...freeformItems],
    updatedAt: new Date().toISOString(),
  }
  shoppingListsCache = shoppingListsCache.map(l => l.id === listId ? updated : l)
  notify()
  putShoppingList(updated, previous)
}

export function addFreeformItem(listId: string, name: string, amount?: number, unit?: string): void {
  const list = shoppingListsCache.find(l => l.id === listId)
  if (!list) return
  const newItem: ShoppingListItem = {
    id: crypto.randomUUID(),
    name,
    amount: amount ?? 1,
    unit: unit ?? null,
    sourceRecipeIds: [],
    aisle: assignAisle(name),
  }
  const previous = shoppingListsCache
  const updated: ShoppingList = { ...list, items: [...list.items, newItem], updatedAt: new Date().toISOString() }
  shoppingListsCache = shoppingListsCache.map(l => l.id === listId ? updated : l)
  notify()
  putShoppingList(updated, previous)
}

export function deleteShoppingList(id: string): void {
  const previous = shoppingListsCache
  shoppingListsCache = shoppingListsCache.filter(l => l.id !== id)
  notify()
  void supabase.from("shopping_lists").delete().eq("id", id).then(({ error }) => {
    if (error) {
      shoppingListsCache = previous
      notify()
      persistFailure("Failed to delete shopping list")(error)
    }
  })
}

export function updateShoppingListName(listId: string, name: string): void {
  const list = shoppingListsCache.find(l => l.id === listId)
  if (!list) return
  const previous = shoppingListsCache
  const updated = { ...list, name, updatedAt: new Date().toISOString() }
  shoppingListsCache = shoppingListsCache.map(l => l.id === listId ? updated : l)
  notify()
  putShoppingList(updated, previous)
}

export function updateShoppingListItems(listId: string, items: ShoppingListItem[]): void {
  const list = shoppingListsCache.find(l => l.id === listId)
  if (!list) return
  const previous = shoppingListsCache
  const updated = { ...list, items, updatedAt: new Date().toISOString() }
  shoppingListsCache = shoppingListsCache.map(l => l.id === listId ? updated : l)
  notify()
  putShoppingList(updated, previous)
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export function getProfiles(): Profile[] {
  return profilesCache
}

export function getDisplayName(userId: string): string | null {
  return profilesCache.find(p => p.id === userId)?.displayName ?? null
}

export function isCurrentUserAdmin(): boolean {
  const userId = getCurrentUserId()
  return profilesCache.find(p => p.id === userId)?.isAdmin ?? false
}

export function updateDisplayName(name: string): void {
  const userId = getCurrentUserId()
  if (!userId) return
  const trimmed = name.trim()
  if (!trimmed) return
  const existing = profilesCache.find(p => p.id === userId)
  const updated: Profile = { id: userId, displayName: trimmed, isAdmin: existing?.isAdmin ?? false }
  const previous = profilesCache
  profilesCache = existing ? profilesCache.map(p => p.id === userId ? updated : p) : [...profilesCache, updated]
  notify()
  void supabase.from("profiles").upsert(toProfileRow(updated)).then(({ error }) => {
    if (error) {
      profilesCache = previous
      notify()
      persistFailure("Failed to save your name")(error)
    }
  })
}
