import { useFieldContext } from "#/lib/form-context"
import { Field, FieldError, FieldLabel } from "#/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"

const TRIGGER_MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45] as const

type TriggerMinuteFieldProps = {
  label: string
}

function TriggerMinuteField({ label }: TriggerMinuteFieldProps) {
  const field = useFieldContext<number | undefined>()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        value={
          field.state.value === undefined ? undefined : String(field.state.value)
        }
        onValueChange={(value) => field.handleChange(Number(value))}
      >
        <SelectTrigger id={field.name} aria-invalid={isInvalid}>
          <SelectValue placeholder="Select a trigger minute" />
        </SelectTrigger>
        <SelectContent>
          {TRIGGER_MINUTE_OPTIONS.map((minute) => (
            <SelectItem key={minute} value={String(minute)}>
              {minute}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

export default TriggerMinuteField
