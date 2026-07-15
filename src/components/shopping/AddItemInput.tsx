import { useState } from "react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"

interface AddItemInputProps {
  onAdd: (name: string) => void
  disabled?: boolean
}

export default function AddItemInput({ onAdd, disabled }: AddItemInputProps) {
  const [value, setValue] = useState("")

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue("")
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Add an item..."
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") handleSubmit()
        }}
        className="flex-1"
        disabled={disabled}
      />
      <Button variant="outline" onClick={handleSubmit} disabled={disabled || !value.trim()}>
        Add
      </Button>
    </div>
  )
}
