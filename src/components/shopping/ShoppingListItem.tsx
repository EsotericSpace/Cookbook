import { useState, useRef } from "react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Icon } from "../ui/icon"
import { formatQuantity, formatMixedQuantity } from "../../lib/ingredient-merge"
import type { ShoppingListItem as ShoppingListItemType } from "../../lib/types"

interface ShoppingListItemProps {
  item: ShoppingListItemType
  editable: boolean
  onChange: (updates: Partial<ShoppingListItemType>) => void
  onDelete: () => void
}

export default function ShoppingListItem({ item, editable, onChange, onDelete }: ShoppingListItemProps) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [editAmount, setEditAmount] = useState(formatQuantity(item.amount) || String(item.amount))
  const nameRef = useRef<HTMLInputElement>(null)

  function saveEdit() {
    const parsedAmount = parseFloat(editAmount)
    onChange({
      name: editName.trim() || item.name,
      amount: isNaN(parsedAmount) ? item.amount : parsedAmount,
    })
    setEditing(false)
  }

  function startEditing() {
    setEditName(item.name)
    setEditAmount(formatQuantity(item.amount) || String(item.amount))
    setEditing(true)
    setTimeout(() => nameRef.current?.focus(), 0)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <Input
          className="w-16 h-7 text-sm px-2"
          value={editAmount}
          onChange={e => setEditAmount(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") saveEdit() }}
          onBlur={saveEdit}
        />
        <Input
          ref={nameRef}
          className="flex-1 h-7 text-sm px-2"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") saveEdit() }}
          onBlur={saveEdit}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={saveEdit}
        >
          <Icon name="check" size="sm" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">
        {formatMixedQuantity(item.amount, item.unit)}
      </span>
      <span className="flex-1 text-sm">
        {item.name}
      </span>
      {editable && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onDelete}
            aria-label="Remove item"
          >
            <Icon name="delete" size="sm" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={startEditing}
            aria-label="Edit item"
          >
            <Icon name="edit" size="sm" />
          </Button>
        </>
      )}
    </div>
  )
}
