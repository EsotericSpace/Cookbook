import { useState } from "react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../ui/collapsible"
import { Badge } from "../ui/badge"
import { Icon } from "../ui/icon"
import { cn } from "../../lib/utils"
import ShoppingListItem from "./ShoppingListItem"
import type { ShoppingListItem as ShoppingListItemType } from "../../lib/types"

interface AisleGroupProps {
  aisle: string
  items: ShoppingListItemType[]
  editable: boolean
  onItemChange: (id: string, updates: Partial<ShoppingListItemType>) => void
  onItemDelete: (id: string) => void
}

export default function AisleGroup({ aisle, items, editable, onItemChange, onItemDelete }: AisleGroupProps) {
  const [open, setOpen] = useState(true)

  const aisleName = aisle.replace(/\b\w/g, c => c.toUpperCase())

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-2 text-left group">
        {open
          ? <Icon name="expand_more" className="text-muted-foreground shrink-0" />
          : <Icon name="chevron_right" className="text-muted-foreground shrink-0" />
        }
        <span className="text-sm font-semibold text-foreground">{aisleName}</span>
        <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0 h-5">
          {items.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={cn("ml-6 divide-y divide-border/50")}>
          {items.map(item => (
            <ShoppingListItem
              key={item.id}
              item={item}
              editable={editable}
              onChange={updates => onItemChange(item.id, updates)}
              onDelete={() => onItemDelete(item.id)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
