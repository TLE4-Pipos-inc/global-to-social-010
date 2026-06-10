import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { getConversationStarterByIdQueryOptions } from "#/features/conversation-starter/hooks/query"
import { Skeleton } from "#/components/ui/skeleton"
import { Button } from "#/components/ui/button"

export const Route = createFileRoute(
  "/interests/$id/conversation-starters/$starterId"
)({
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient.prefetchQuery(
      getConversationStarterByIdQueryOptions(params.starterId)
    )
  },
  pendingMs: 300,
  pendingMinMs: 200,
  pendingComponent: () => <ConversationStarterDetailSkeleton />,
  errorComponent: ({ error }) => (
    <ConversationStarterDetailError error={error} />
  ),
  component: () => <Outlet />,
})

function ConversationStarterDetailSkeleton() {
  return (
    <div className="flex items-end justify-between py-2">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
  )
}

function ConversationStarterDetailError({ error }: { error: Error }) {
  const { id } = Route.useParams()

  return (
    <>
      <div className="flex items-end justify-between py-2">
        <Button
          variant="outline"
          render={<Link to="/interests/$id" params={{ id }} />}
          nativeButton={false}
        >
          Back to Conversation Starters
        </Button>
      </div>
      <div className="text-center">
        <h1 className="text-lg font-semibold">
          Error loading conversation starter
        </h1>
        <p>{error.message}</p>
      </div>
    </>
  )
}
