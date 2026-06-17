import { useFieldContext } from "#/lib/form-context"
import { Field, FieldError, FieldLabel } from "#/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"
import { useGetPartnerPartnerships } from "#/features/partner/hooks/query"
import { useGetVenues } from "#/features/venue/hooks/query"

type PartnershipSelectFieldProps = {
  label: string
  partnerId: string
  disabled?: boolean
}

function PartnershipSelectField({
  label,
  partnerId,
  disabled,
}: PartnershipSelectFieldProps) {
  const field = useFieldContext<string>()
  const partnerships = useGetPartnerPartnerships(partnerId)
  const venues = useGetVenues()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  const venueNamesById = new Map(venues.data.map((venue) => [venue.id, venue.name]))
  const labelFor = (partnershipId: string) => {
    const partnership = partnerships.data.find((item) => item.id === partnershipId)
    if (!partnership) return partnershipId
    return venueNamesById.get(partnership.venueId) ?? partnership.venueId
  }

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
            {(value: string) => labelFor(value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {partnerships.data.map((partnership) => (
            <SelectItem key={partnership.id} value={partnership.id}>
              {venueNamesById.get(partnership.venueId) ?? partnership.venueId}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

export default PartnershipSelectField
