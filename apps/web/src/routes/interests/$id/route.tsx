import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { getInterestByIdQueryOptions } from "#/features/interest/hooks/query"
import { Skeleton } from "#/components/ui/skeleton"
import { Button } from "#/components/ui/button"

export const Route = createFileRoute("/interests/$id")({
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient.prefetchQuery(getInterestByIdQueryOptions(params.id))
  },
  pendingMs: 300,
  pendingMinMs: 200,
  pendingComponent: () => <InterestDetailSkeleton />,
  errorComponent: ({ error }) => <InterestDetailError error={error} />,
  component: () => <Outlet />,
})

function InterestDetailSkeleton() {
  return (
    <div className="flex items-end justify-between py-2">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
  )
}

function InterestDetailError({ error }: { error: Error }) {
  return (
    <>
      <div className="flex items-end justify-between py-2">
        <Button variant="outline">
          <Link to="/interests">Back to Interests</Link>
        </Button>
      </div>
      <div className="text-center">
        <h1 className="text-lg font-semibold">Error loading interest</h1>
        <p>{error.message}</p>
      </div>
    </>
  )
}
