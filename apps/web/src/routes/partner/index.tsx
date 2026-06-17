import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "#/components/ui/button"
import { Skeleton } from "#/components/ui/skeleton"
import { checkRole } from "#/lib/route-guard"
import {
  useGetMyPartner,
  useGetPartnerDeals,
  useGetPartnerPartnerships,
} from "#/features/partner/hooks/query"
import { useGetVenues } from "#/features/venue/hooks/query"
import { VenueInfo } from "#/features/partner/components/venue-info"
import { DealList } from "#/features/partner/components/deal-list"

export const Route = createFileRoute("/partner/")({
  beforeLoad: async ({ location }) => {
    await checkRole(location.pathname, ["partner", "admin"])
  },
  pendingMs: 300,
  pendingMinMs: 200,
  pendingComponent: () => <RoutePending />,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: RouteComponent,
})

function RoutePending() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

function RouteError({ error }: { error: Error }) {
  return <div>Error loading page: {error.message}</div>
}

function RouteComponent() {
  const partner = useGetMyPartner()

  if (!partner.data) {
    return (
      <div className="flex flex-col gap-4 py-2">
        <h1 className="text-2xl">Partner Dashboard</h1>
        <p className="text-muted-foreground">
          No partner profile is linked to your account yet.
        </p>
      </div>
    )
  }

  return <PartnerDashboard partnerId={partner.data.id} />
}

function PartnerDashboard({ partnerId }: { partnerId: string }) {
  const partnerships = useGetPartnerPartnerships(partnerId)
  const deals = useGetPartnerDeals(partnerId)
  const venues = useGetVenues()

  const venuesById = new Map(venues.data.map((venue) => [venue.id, venue]))

  // Group deals by the partnership they belong to.
  const dealsByPartnership = new Map<string, typeof deals.data>()
  for (const deal of deals.data) {
    const existing = dealsByPartnership.get(deal.partnershipId) ?? []
    existing.push(deal)
    dealsByPartnership.set(deal.partnershipId, existing)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between py-2">
        <h1 className="text-2xl">Partner Dashboard</h1>
        <Button
          render={<Link to="/partner/deals/create" />}
          nativeButton={false}
        >
          Add deal
        </Button>
      </div>

      {partnerships.data.length === 0 ? (
        <p className="text-muted-foreground">
          You aren't linked to any venues yet. An admin can link you to a venue.
        </p>
      ) : (
        partnerships.data.map((partnership) => {
          const venue = venuesById.get(partnership.venueId)
          return (
            <div key={partnership.id} className="flex flex-col gap-4">
              {venue && <VenueInfo venue={venue} />}
              <DealList deals={dealsByPartnership.get(partnership.id) ?? []} />
            </div>
          )
        })
      )}
    </div>
  )
}
