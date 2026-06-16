import { useFieldContext } from "#/lib/form-context"
import { Field, FieldError, FieldLabel } from "#/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"
import { useGetVenues } from "#/features/venue/hooks/query"

type VenueSelectFieldProps = {
  label: string
  disabled?: boolean
}

function VenueSelectField({ label, disabled }: VenueSelectFieldProps) {
  const field = useFieldContext<string>()
  const venues = useGetVenues()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  const labelsById = new Map(
    venues.data.map((venue) => [venue.id, venue.name])
  )

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        value={field.state.value || undefined}
        onValueChange={(value) => field.handleChange(value)}
        disabled={disabled}
      >
        <SelectTrigger id={field.name} aria-invalid={isInvalid}>
          <SelectValue placeholder="Select a venue">
            {(value: string) => labelsById.get(value) ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {venues.data.map((venue) => (
            <SelectItem key={venue.id} value={venue.id}>
              {venue.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

export default VenueSelectField
