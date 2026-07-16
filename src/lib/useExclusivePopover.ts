import { useEffect, useRef, useState } from "react"

// Radix's own outside-click dismissal doesn't reliably close a popover when
// the click lands on a *different* popover's trigger (both end up open at
// once), since that trigger's own click handler races with the dismiss
// layer's outside-pointerdown check. Coordinating a single "which instance
// is open" id here sidesteps that — opening one always force-closes any
// other, regardless of how the change was triggered.
let activeId: symbol | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(l => l())
}

export function useExclusivePopover(): [boolean, (open: boolean) => void] {
  const idRef = useRef(Symbol())
  const [, forceRender] = useState(0)

  useEffect(() => {
    const id = idRef.current
    const listener = () => forceRender(n => n + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      if (activeId === id) {
        activeId = null
        notify()
      }
    }
  }, [])

  function setOpen(next: boolean) {
    if (next) {
      activeId = idRef.current
    } else if (activeId === idRef.current) {
      activeId = null
    }
    notify()
  }

  return [activeId === idRef.current, setOpen]
}
