import { useSyncExternalStore } from "react"
import { toast } from "sonner"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./supabaseClient"

let sessionCache: Session | null = null
let sessionResolved = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(l => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSessionSnapshot(): Session | null {
  return sessionCache
}

function getResolvedSnapshot(): boolean {
  return sessionResolved
}

let initPromise: Promise<void> | null = null

export function initializeAuth(): Promise<void> {
  if (!initPromise) initPromise = doInitializeAuth()
  return initPromise
}

async function doInitializeAuth(): Promise<void> {
  // A magic link that fails to exchange (most commonly: opened on a
  // different device/browser than it was requested from, since Supabase's
  // default PKCE flow keeps the code verifier in the requesting browser's
  // localStorage) redirects back with an error in the URL rather than
  // throwing where we could easily catch it.
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  const authError = searchParams.get("error_description") || hashParams.get("error_description")
  if (authError) {
    toast.error("Sign-in link didn't work", {
      description: authError.toLowerCase().includes("code verifier")
        ? "Open the link on the same device and browser you requested it from, or request a new one."
        : authError,
    })
  }

  const { data } = await supabase.auth.getSession()
  sessionCache = data.session
  sessionResolved = true
  notify()

  if (searchParams.has("code") || hashParams.has("access_token") || authError) {
    window.history.replaceState({}, "", window.location.pathname)
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    sessionCache = session
    notify()
  })
}

export async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  return { error: error?.message ?? null }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export function getCurrentUserId(): string | null {
  return sessionCache?.user.id ?? null
}

export function getCurrentUserEmail(): string | null {
  return sessionCache?.user.email ?? null
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSessionSnapshot)
}

export function useAuthResolved(): boolean {
  return useSyncExternalStore(subscribe, getResolvedSnapshot)
}
