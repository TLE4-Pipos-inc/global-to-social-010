import { createFileRoute, Link } from "@tanstack/react-router"
import { FieldGroup, Field, FieldLabel } from "#/components/ui/field"
import { Button } from "#/components/ui/button"
import { Switch } from "#/components/ui/switch"
import { Spinner } from "#/components/ui/spinner"
import { usePartnerForm } from "#/features/partner/hooks/form"
import {
  useGetMyPartner,
  useGetPartnerDeals,
  useUpdateDeal,
} from "#/features/partner/hooks/query"
import { DealUpdateSchema } from "@pub-hopper/schemas"
import type { DealResponse } from "@pub-hopper/schemas"
import { toast } from "sonner"

export const Route = createFileRoute("/partner/deals/$dealId/edit")({
  component: RouteComponent,
})

// date inputs expect "YYYY-MM-DD". Stored values are "YYYY-MM-DDT00:00", so slice
// the date portion directly — converting via toISOString() would shift the day for
// non-UTC timezones (e.g. NL local midnight becomes the previous day in UTC).
function toDateInput(value: string | null): string {
  if (!value) return ""
  if (Number.isNaN(Date.parse(value))) return ""
  return value.slice(0, 10)
}

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

  return <DealLoader partnerId={partner.data.id} />
}

function DealLoader({ partnerId }: { partnerId: string }) {
  const { dealId } = Route.useParams()
  const navigate = Route.useNavigate()
  const deals = useGetPartnerDeals(partnerId)
  const updateDeal = useUpdateDeal(dealId)

  const deal = deals.data.find((item) => item.id === dealId)

  if (!deal) {
    return <NotFound message="Deal not found." />
  }

  return <DealEditForm deal={deal} dealId={dealId} updateDeal={updateDeal} navigate={navigate} />
}

function DealEditForm({
  deal,
  dealId,
  updateDeal,
  navigate,
}: {
  deal: DealResponse
  dealId: string
  updateDeal: ReturnType<typeof useUpdateDeal>
  navigate: ReturnType<typeof Route.useNavigate>
}) {
  const form = usePartnerForm({
    defaultValues: {
      title: deal.title,
      description: deal.description ?? "",
      startsAt: toDateInput(deal.startsAt),
      endsAt: toDateInput(deal.endsAt),
      active: deal.active,
    },
    onSubmit: ({ value }) => {
      const payload = {
        title: value.title,
        description: value.description ? value.description : null,
        startsAt: value.startsAt ? `${value.startsAt}T00:00` : null,
        endsAt: value.endsAt ? `${value.endsAt}T00:00` : null,
        active: value.active,
      }

      const parsed = DealUpdateSchema.safeParse(payload)
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid deal data")
        return
      }

      updateDeal.mutate(
        { id: dealId, ...parsed.data },
        {
          onSuccess: () => {
            toast.success("Deal updated successfully")
            navigate({ to: "/partner" })
          },
          onError: (error) => {
            toast.error(
              error instanceof Error ? error.message : "Failed to update deal"
            )
          },
        }
      )
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
          <Button type="submit" disabled={updateDeal.isPending}>
            {updateDeal.isPending && <Spinner />}
            {updateDeal.isPending ? "Saving..." : "Save deal"}
          </Button>
        </FieldGroup>
      </form>
    </>
  )
}
