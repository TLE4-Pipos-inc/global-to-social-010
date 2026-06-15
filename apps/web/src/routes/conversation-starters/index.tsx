import { createFileRoute, Link } from "@tanstack/react-router"
import {
  getConversationStartersQueryOptions,
  useGetConversationStarters,
} from "#/features/conversation-starter/hooks/query"
import { Button } from "#/components/ui/button"
import { ConversationStarterCard } from "#/features/conversation-starter/components/conversation-starter-card"
import { Skeleton } from "#/components/ui/skeleton"

export const Route = createFileRoute("/conversation-starters/")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(
      getConversationStartersQueryOptions({ interestsId: null })
    )
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
  return <div>Error loading conversation starters: {error.message}</div>
}

function RouteComponent() {
  const conversationStarters = useGetConversationStarters({
    interestsId: null,
  })

  const data = conversationStarters.data.result.conversationStarters

  return (
    <>
      <div className="flex items-end justify-between py-2">
        <Button variant="outline" render={<Link to="/interests" />} nativeButton={false}>
          Back to Interests
        </Button>
      </div>

      <h1 className="text-2xl">General</h1>

      <div className="flex items-end justify-between py-2">
        <h2 className="text-xl">Conversation Starters</h2>
        <Button
          variant="outline"
          render={<Link to="/conversation-starters/create" />}
          nativeButton={false}
        >
          Create Conversation Starter
        </Button>
      </div>

      {data.length === 0 ? (
        <p>No conversation starters found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {data.map((starter) => (
            <ConversationStarterCard key={starter.id} starter={starter} />
          ))}
        </div>
      )}
    </>
  )
}
