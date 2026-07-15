import { Textarea } from "../ui/textarea"
import { Button } from "../ui/button"
import { Icon } from "../ui/icon"

interface StepInputProps {
  steps: string[]
  onChange: (steps: string[]) => void
}

export default function StepInput({ steps, onChange }: StepInputProps) {
  function updateStep(index: number, value: string) {
    onChange(steps.map((s, i) => (i === index ? value : s)))
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index))
  }

  function addStep() {
    onChange([...steps, ""])
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-2 items-start">
          <span className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold mt-1">
            {index + 1}
          </span>
          <Textarea
            className="flex-1 min-h-[80px]"
            placeholder={`Step ${index + 1}...`}
            value={step}
            onChange={e => updateStep(index, e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeStep(index)}
            className="shrink-0 text-muted-foreground hover:text-destructive mt-1"
          >
            <Icon name="delete" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addStep}
      >
        <Icon name="add" className="mr-1 text-primary" />
        Add step
      </Button>
    </div>
  )
}
