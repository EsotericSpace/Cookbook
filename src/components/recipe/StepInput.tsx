import { Textarea } from "../ui/textarea"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Icon } from "../ui/icon"
import type { StepSection } from "../../lib/types"

interface StepInputProps {
  sections: StepSection[]
  onChange: (sections: StepSection[]) => void
}

export default function StepInput({ sections, onChange }: StepInputProps) {
  function updateSection(index: number, section: StepSection) {
    onChange(sections.map((s, i) => (i === index ? section : s)))
  }

  function updateStep(sectionIndex: number, itemIndex: number, value: string) {
    const section = sections[sectionIndex]
    updateSection(sectionIndex, {
      ...section,
      items: section.items.map((s, i) => (i === itemIndex ? value : s)),
    })
  }

  function removeStep(sectionIndex: number, itemIndex: number) {
    const section = sections[sectionIndex]
    updateSection(sectionIndex, { ...section, items: section.items.filter((_, i) => i !== itemIndex) })
  }

  function addStep(sectionIndex: number) {
    const section = sections[sectionIndex]
    updateSection(sectionIndex, { ...section, items: [...section.items, ""] })
  }

  function updateSectionTitle(sectionIndex: number, title: string) {
    updateSection(sectionIndex, { ...sections[sectionIndex], title })
  }

  function removeSection(sectionIndex: number) {
    onChange(sections.filter((_, i) => i !== sectionIndex))
  }

  function addSection() {
    onChange([...sections, { title: "", items: [""] }])
  }

  return (
    <div className="space-y-5">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-3">
          {sections.length > 1 && (
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Section name"
                value={section.title ?? ""}
                onChange={e => updateSectionTitle(sectionIndex, e.target.value)}
                className="font-medium"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSection(sectionIndex)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Icon name="delete" />
              </Button>
            </div>
          )}

          {section.items.map((step, itemIndex) => (
            <div key={itemIndex} className="flex gap-2 items-start">
              <span className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold mt-1">
                {itemIndex + 1}
              </span>
              <Textarea
                className="flex-1 min-h-[80px]"
                placeholder={`Step ${itemIndex + 1}`}
                value={step}
                onChange={e => updateStep(sectionIndex, itemIndex, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeStep(sectionIndex, itemIndex)}
                className="shrink-0 text-muted-foreground hover:text-destructive mt-1"
              >
                <Icon name="delete" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addStep(sectionIndex)}>
            <Icon name="add" className="text-primary" />
            Add step
          </Button>
        </div>
      ))}

      <Button type="button" variant="ghost" size="sm" onClick={addSection}>
        <Icon name="add" className="text-primary" />
        Add section
      </Button>
    </div>
  )
}
