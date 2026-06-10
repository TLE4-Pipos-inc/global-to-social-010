import { createFileRoute, Link } from "@tanstack/react-router"
import {
  useDeleteInterest,
  useGetInterestById,
} from "#/features/interest/hooks/query"
import { useGetConversationStarters } from "#/features/conversation-starter/hooks/query"
import { ConversationStarterCard } from "#/features/conversation-starter/components/conversation-starter-card"
import { Button } from "#/components/ui/button"

export const Route = createFileRoute("/interests/$id/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const getInterest = useGetInterestById(id)
  const deleteInterest = useDeleteInterest(id)
  const conversationStarters = useGetConversationStarters({ interestsId: id })
  const navigate = Route.useNavigate()

  const interest = getInterest.data.result
  const starters = conversationStarters.data.result.conversationStarters

  return (
    <main>
      <div className="flex items-end justify-between py-2">
        <Button variant="outline" render={<Link to="/interests" />} nativeButton={false}>
          Back to Interests
        </Button>

        <div className="space-x-2">
          <Button
            variant="outline"
            disabled={deleteInterest.isPending}
            onClick={() => {
              deleteInterest.mutate(undefined, {
                onSuccess: () => {
                  navigate({ to: "/interests" })
                },
              })
            }}
          >
            Delete Interest
          </Button>
          <Button
            variant="outline"
            render={<Link to="/interests/$id/edit" params={{ id: interest.id }} />}
            nativeButton={false}
          >
            Edit Interest
          </Button>
        </div>
      </div>

      <h1 className="text-2xl">{interest.name}</h1>

      <div className="flex items-end justify-between py-2">
        <h2 className="text-xl">Conversation Starters</h2>
        <Button
          variant="outline"
          render={
            <Link
              to="/interests/$id/conversation-starters/create"
              params={{ id: interest.id }}
            />
          }
          nativeButton={false}
        >
          Create Conversation Starter
        </Button>
      </div>
      {starters.length === 0 ? (
        <p>No conversation starters found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {starters.map((starter) => (
            <ConversationStarterCard
              key={starter.id}
              starter={starter}
              interestId={interest.id}
            />
          ))}
        </div>
      )}
    </main>
  )
}
