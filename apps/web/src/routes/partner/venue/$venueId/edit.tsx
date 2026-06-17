import { createFileRoute, Link } from "@tanstack/react-router"
import { FieldGroup } from "#/components/ui/field"
import { Button } from "#/components/ui/button"
import { Spinner } from "#/components/ui/spinner"
import { usePartnerForm } from "#/features/partner/hooks/form"
import {
  useGetMyPartner,
  useGetPartnerPartnerships,
} from "#/features/partner/hooks/query"
import { useGetVenueById, useUpdateVenue } from "#/features/venue/hooks/query"
import { VenueUpdateSchema } from "@pub-hopper/schemas"
import { toast } from "sonner"

export const Route = createFileRoute("/partner/venue/$venueId/edit")({
  component: RouteComponent,
})

function NotFound({ message }: { message: string }) {
  return (
    <>
      <div className="flex items-end justify-between py-2">
        <Button variant="outline" render={<Link to="/partner" />} nativeButton={false}>
          Back to dashboard
        </Button>
      </div>
      <p className="text-muted-foreground">{message}</p>
    </>
  )
}

function RouteComponent() {
  const partner = useGetMyPartner()

  if (!partner.data) {
    return <NotFound message="No partner profile is linked to your account yet." />
  }

  return <VenueEditLoader partnerId={partner.data.id} />
}

function VenueEditLoader({ partnerId }: { partnerId: string }) {
  const { venueId } = Route.useParams()
  const navigate = Route.useNavigate()
  const partnerships = useGetPartnerPartnerships(partnerId)
  const getVenue = useGetVenueById(venueId)
  const updateVenue = useUpdateVenue(venueId)

  // Only allow editing venues this partner is linked to (guards URL tampering).
  const ownsVenue = partnerships.data.some((p) => p.venueId === venueId)
  if (!ownsVenue) {
    return <NotFound message="Venue not found." />
  }

  const venue = getVenue.data.result

  const form = usePartnerForm({
    defaultValues: {
      name: venue.name,
      venueType: venue.venueType,
      address: venue.address,
      description: venue.description ?? "",
      vibe: venue.vibe ?? "",
    },
    validators: {
      onSubmit: VenueUpdateSchema,
    },
    onSubmit: ({ value }) => {
      updateVenue.mutate(value, {
        onSuccess: () => {
          toast.success("Venue updated successfully")
          navigate({ to: "/partner" })
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to update venue"
          )
        },
      })
    },
  })

  return (
    <>
      <div className="flex items-end justify-between py-2">
        <Button variant="outline" render={<Link to="/partner" />} nativeButton={false}>
          Back to dashboard
        </Button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.AppField
            name="name"
            children={(field) => <field.InputField label="Name" placeholder="Venue name" />}
          />
          <form.AppField
            name="venueType"
            children={(field) => (
              <field.InputField label="Type" placeholder="e.g. Pub, Bar, Club" />
            )}
          />
          <form.AppField
            name="address"
            children={(field) => <field.InputField label="Address" placeholder="Address" />}
          />
          <form.AppField
            name="description"
            children={(field) => (
              <field.TextAreaField
                label="Description"
                placeholder="Describe the venue"
                maxCharacters="500"
              />
            )}
          />
          <form.AppField
            name="vibe"
            children={(field) => <field.InputField label="Vibe" placeholder="e.g. Cozy, Lively" />}
          />
          <Button type="submit" disabled={updateVenue.isPending}>
            {updateVenue.isPending && <Spinner />}
            {updateVenue.isPending ? "Saving..." : "Save venue"}
          </Button>
        </FieldGroup>
      </form>
    </>
  )
}
