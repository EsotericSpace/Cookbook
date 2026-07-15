import { forwardRef, type ComponentPropsWithoutRef } from "react"
import { cn } from "../../lib/utils"

export type IconSize = "xxs" | "xs" | "sm" | "md" | "lg" | "xl"

// Single source of truth for icon sizing — change a value here to resize
// every icon at that tier app-wide.
const ICON_SIZES: Record<IconSize, string> = {
  xxs: "text-sm",             // 14px, tiny inline indicator (e.g. combobox checkmark)
  xs: "text-base",            // 16px
  sm: "text-xl",              // 20px
  md: "text-2xl",             // 24px (default)
  lg: "text-3xl",             // 30px
  xl: "text-[5rem]",          // 80px, empty-state hero icons
}

interface IconProps extends ComponentPropsWithoutRef<"span"> {
  name: string
  size?: IconSize
}

export const Icon = forwardRef<HTMLSpanElement, IconProps>(function Icon(
  { name, size = "md", className, ...props },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn("material-icons-outlined leading-none align-middle select-none", ICON_SIZES[size], className)}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  )
})
