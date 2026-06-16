import { createFileRoute, Link } from "@tanstack/react-router"
import { FieldGroup, Field, FieldLabel } from "#/components/ui/field"
import { Button } from "#/components/ui/button"
import { Switch } from "#/components/ui/switch"
import { Spinner } from "#/components/ui/spinner"
import { usePartnerForm } from "#/features/partner/hooks/form"
import {
  useCreateDeal,
  useGetMyPartner,
  useGetPartnerPartnerships,
} from "#/features/partner/hooks/query"
import { DealCreateSchema } from "@pub-hopper/schemas"
import { toast } from "sonner"

export const Route = createFileRoute("/partner/deals/create")({
  component: RouteComponent,
})

function RouteComponent() {
  const partner = useGetMyPartner()

  if (!partner.data) {
    return (
      <>
        <div className="flex items-end justify-between py-2">
          <Button variant="outline" render={<Link to="/partner" />} nativeButton={false}>
            Back to dashboard
          </Button>
        </div>
        <p className="text-muted-foreground">
          No partner profile is linked to your account yet.
        </p>
      </>
    )
  }

  return <CreateDealForm partnerId={partner.data.id} />
}

function CreateDealForm({ partnerId }: { partnerId: string }) {
  const navigate = Route.useNavigate()
  const createDeal = useCreateDeal()
  const partnerships = useGetPartnerPartnerships(partnerId)

  if (partnerships.data.length === 0) {
    return (
      <>
        <div className="flex items-end justify-between py-2">
          <Button variant="outline" render={<Link to="/partner" />} nativeButton={false}>
            Back to dashboard
          </Button>
        </div>
        <p className="text-muted-foreground">
          You need to be linked to a venue before creating a deal.
        </p>
      </>
    )
  }

  // Pre-select the venue when the partner is linked to exactly one.
  const defaultPartnershipId =
    partnerships.data.length === 1 ? partnerships.data[0].id : ""

  const form = usePartnerForm({
    defaultValues: {
      partnershipId: defaultPartnershipId,
      title: "",
      description: "",
      startsAt: "",
      endsAt: "",
      active: true,
    },
    onSubmit: ({ value }) => {
      const payload = {
        partnershipId: value.partnershipId,
        title: value.title,
        description: value.description ? value.description : null,
        startsAt: value.startsAt ? `${value.startsAt}T00:00` : null,
        endsAt: value.endsAt ? `${value.endsAt}T00:00` : null,
        active: value.active,
      }

      const parsed = DealCreateSchema.safeParse(payload)
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid deal data")
        return
      }

      createDeal.mutate(parsed.data, {
        onSuccess: () => {
          toast.success("Deal created successfully")
          navigate({ to: "/partner" })
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to create deal"
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
            name="partnershipId"
            children={(field) => (
              <field.PartnershipSelectField label="Venue" partnerId={partnerId} />
            )}
          />
          <form.AppField
            name="title"
            children={(field) => (
              <field.InputField label="Deal title" placeholder="e.g. 2-for-1 cocktails" />
            )}
          />
          <form.AppField
            name="description"
            children={(field) => (
              <field.TextAreaField
                label="Description"
                placeholder="Describe the deal"
                maxCharacters="500"
              />
            )}
          />
          <form.AppField
            name="startsAt"
            children={(field) => <field.InputField label="Starts at" type="date" />}
          />
          <form.AppField
            name="endsAt"
            children={(field) => <field.InputField label="Ends at" type="date" />}
          />
          <form.AppField
            name="active"
            children={(field) => (
              <Field orientation="horizontal">
                <FieldLabel htmlFor={field.name}>Active</FieldLabel>
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </Field>
            )}
          />
          <Button type="submit" disabled={createDeal.isPending}>
            {createDeal.isPending && <Spinner />}
            {createDeal.isPending ? "Creating..." : "Create deal"}
          </Button>
        </FieldGroup>
      </form>
    </>
  )
}
