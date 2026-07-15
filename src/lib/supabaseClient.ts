import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
// Supabase's client-side key: shown as "Publishable key" in the dashboard
// for projects created after Nov 2025 (the old "anon key" naming still
// works the same way under the hood, just renamed/reformatted).
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — copy .env.example to .env.local and fill in your Supabase project's values."
  )
}

export const supabase = createClient(url, publishableKey)
