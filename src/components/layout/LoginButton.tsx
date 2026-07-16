import { useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover"
import { signInWithMagicLink } from "../../lib/auth"

export default function LoginButton() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setEmail("")
      setSent(false)
      setSubmitting(false)
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

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="default" size="sm">Log in</Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        {sent ? (
          <p className="text-sm text-muted-foreground">
            Check your email for a sign-in link.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Sign in with email</p>
            <Input
              autoFocus
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
      </PopoverContent>
    </Popover>
  )
}
