import { useFieldContext } from "#/lib/form-context"
import { Field, FieldError, FieldLabel } from "#/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"
import { useGetInterests } from "#/features/interest/hooks/query"

const GENERAL_VALUE = "general"

type InterestSelectFieldProps = {
  label: string
  disabled?: boolean
}

function InterestSelectField({ label, disabled }: InterestSelectFieldProps) {
  const field = useFieldContext<string | null>()
  const interests = useGetInterests()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  const labelsById = new Map(
    interests.data.result.map((interest) => [interest.id, interest.name])
  )

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        value={field.state.value ?? GENERAL_VALUE}
        onValueChange={(value) =>
          field.handleChange(value === GENERAL_VALUE ? null : value)
        }
        disabled={disabled}
      >
        <SelectTrigger id={field.name} aria-invalid={isInvalid}>
          <SelectValue placeholder="Select a category">
            {(value: string) =>
              value === GENERAL_VALUE
                ? "General"
                : (labelsById.get(value) ?? value)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={GENERAL_VALUE}>General</SelectItem>
          {interests.data.result.map((interest) => (
            <SelectItem key={interest.id} value={interest.id}>
              {interest.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

export default InterestSelectField
