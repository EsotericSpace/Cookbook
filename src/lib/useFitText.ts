import { useLayoutEffect, useRef, useState } from "react"

let measureCtx: CanvasRenderingContext2D | null = null
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d")
  return measureCtx
}

interface FitTextOptions {
  min?: number
  max?: number
}

// Binary-searches the largest font size (in px) at which `text` still fits
// on one line within the element's current width, re-measuring on resize.
export function useFitText<T extends HTMLElement>(text: string, { min = 12, max = 18 }: FitTextOptions = {}) {
  const ref = useRef<T>(null)
  const [fontSize, setFontSize] = useState(max)

  useLayoutEffect(() => {
    const el = ref.current
    const ctx = getMeasureCtx()
    if (!el || !ctx) return

    function measure() {
      if (!el || !ctx) return
      const width = el.clientWidth
      if (width <= 0) return
      const style = getComputedStyle(el)

      let lo = min, hi = max, best = min
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2
        ctx.font = `${style.fontWeight} ${mid}px ${style.fontFamily}`
        if (ctx.measureText(text).width <= width) {
          best = mid
          lo = mid
        } else {
          hi = mid
        }
      }
      setFontSize(best)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, min, max])

  return { ref, fontSize }
}
