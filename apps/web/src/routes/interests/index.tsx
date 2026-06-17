import { createFileRoute, Link } from "@tanstack/react-router"
import {
  getInterestsQueryOptions,
  useGetInterests,
} from "../../features/interest/hooks/query"
import { Button } from "#/components/ui/button"
import { InterestCard, InterestGeneralCard } from "#/features/interest/components/interest-card"
import { Skeleton } from "#/components/ui/skeleton"

export const Route = createFileRoute("/interests/")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(getInterestsQueryOptions)
  },
  pendingMs: 300,
  pendingMinMs: 200,
  pendingComponent: () => <RoutePending />,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: RouteComponent,
})

function RoutePending() {
  return (
    <>
      <div className="flex items-end justify-between py-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    </>
  )
}

function RouteError({ error }: { error: Error }) {
  return <div>Error loading interests: {error.message}</div>
}

function RouteComponent() {
  const interests = useGetInterests()

  const interestsData = interests.data.result

  return (
    <>
      <div className="flex items-end justify-between py-2">
        <h1 className="text-2xl">Interests</h1>

        <Button variant="outline" render={<Link to="/interests/create" />} nativeButton={false}>
          Create Interest
        </Button>
      </div>
      {interestsData.length === 0 ? (
        <p>No interests found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <InterestGeneralCard />
          {interestsData.map((interest) => (
            <InterestCard key={interest.id} interest={interest} />
          ))}
        </div>
      )}
    </>
  )
}
