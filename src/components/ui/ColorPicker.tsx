import { cn } from "../../lib/utils"
import { COLOR_PALETTE, type ColorKey } from "../../lib/colors"

interface ColorPickerProps {
  value: string
  onChange: (colorKey: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {(Object.entries(COLOR_PALETTE) as [ColorKey, typeof COLOR_PALETTE[ColorKey]][]).map(([key, swatch]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
            swatch.dot,
            value === key ? "border-foreground" : "border-transparent"
          )}
          aria-label={key}
        />
      ))}
    </div>
  )
}
