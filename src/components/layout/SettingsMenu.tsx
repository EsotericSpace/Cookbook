import { useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Icon } from "../ui/icon"
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "../ui/popover"
import { Separator } from "../ui/separator"
import { useSession, signInWithMagicLink, signOut } from "../../lib/auth"
import { getDisplayName, updateDisplayName, subscribe } from "../../lib/storage"
import { useTheme } from "../../lib/theme"

export default function SettingsMenu() {
  const session = useSession()
  // Re-render when the display name changes (e.g. after saving an edit, or
  // arriving live from another session).
  const displayName = useSyncExternalStore(subscribe, () => session ? getDisplayName(session.user.id) : null)
  const { theme, toggleTheme } = useTheme()

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState("")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setEmail("")
      setSent(false)
      setSubmitting(false)
      setEditingName(false)
    }
  }

  async function handleSubmit() {
    const trimmed = email.trim()
    if (!trimmed) return
    setSubmitting(true)
    const { error } = await signInWithMagicLink(trimmed)
    setSubmitting(false)
    if (error) {
      toast.error("Couldn't send sign-in link", { description: error })
      return
    }
    setSent(true)
  }

  const name = session ? (displayName ?? session.user.email ?? "") : null

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Icon name="settings" size="lg" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" align="end">
        {session && (
          <>
            {editingName ? (
              <Input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={() => { updateDisplayName(nameValue); setEditingName(false) }}
                onKeyDown={e => {
                  if (e.key === "Enter") { updateDisplayName(nameValue); setEditingName(false) }
                  if (e.key === "Escape") setEditingName(false)
                }}
                className="h-8 text-sm"
              />
            ) : (
              <button
                type="button"
                onClick={() => { setNameValue(name ?? ""); setEditingName(true) }}
                className="block w-full truncate text-left text-sm font-medium hover:text-primary transition-colors"
                title="Click to change your name"
              >
                {name}
              </button>
            )}
            <Separator />
          </>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
        >
          <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size="sm" className="opacity-50" />
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        {session ? (
          <PopoverClose asChild>
            <button
              type="button"
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Icon name="logout" size="sm" className="opacity-50" />
              Sign out
            </button>
          </PopoverClose>
        ) : (
          <>
            <Separator />
            {sent ? (
              <p className="text-sm text-muted-foreground">
                Check your email for a sign-in link.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Sign in with email</p>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSubmit() }}
                  className="h-8 text-sm"
                />
                <Button size="sm" className="w-full" onClick={handleSubmit} disabled={!email.trim() || submitting}>
                  Send link
                </Button>
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
