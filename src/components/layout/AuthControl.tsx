import { useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover"
import { useSession, signInWithMagicLink, signOut } from "../../lib/auth"
import { getDisplayName, updateDisplayName, subscribe } from "../../lib/storage"

export default function AuthControl() {
  const session = useSession()
  // Re-render when the display name changes (e.g. after saving an edit, or
  // arriving live from another session).
  const displayName = useSyncExternalStore(subscribe, () => session ? getDisplayName(session.user.id) : null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState("")

  function resetAndClose() {
    setOpen(false)
    setEmail("")
    setSent(false)
    setSubmitting(false)
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

  if (session) {
    const name = displayName ?? session.user.email ?? ""

    if (editingName) {
      return (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={() => { updateDisplayName(nameValue); setEditingName(false) }}
            onKeyDown={e => {
              if (e.key === "Enter") { updateDisplayName(nameValue); setEditingName(false) }
              if (e.key === "Escape") setEditingName(false)
            }}
            className="h-8 w-36 text-sm"
          />
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        <span
          className="text-sm text-muted-foreground hidden sm:inline cursor-pointer hover:text-primary transition-colors"
          onClick={() => { setNameValue(name); setEditingName(true) }}
          title="Click to change your name"
        >
          {name}
        </span>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={o => { if (!o) resetAndClose(); else setOpen(true) }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Sign in
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
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
              autoFocus
            />
            <Button size="sm" className="w-full" onClick={handleSubmit} disabled={!email.trim() || submitting}>
              Send link
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
