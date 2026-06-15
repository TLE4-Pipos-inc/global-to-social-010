import { createFileRoute, Link } from "@tanstack/react-router"
import {
  useDeleteConversationStarter,
  useGetConversationStarterById,
} from "#/features/conversation-starter/hooks/query"
import { Button } from "#/components/ui/button"

export const Route = createFileRoute(
  "/interests/$id/conversation-starters/$starterId/"
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { id, starterId } = Route.useParams()
  const getConversationStarter = useGetConversationStarterById(starterId)
  const deleteConversationStarter = useDeleteConversationStarter(starterId)
  const navigate = Route.useNavigate()

  const starter = getConversationStarter.data.result

  return (
    <main>
      <div className="flex items-end justify-between py-2">
        <Button
          variant="outline"
          render={<Link to="/interests/$id" params={{ id }} />}
          nativeButton={false}
        >
          Back to Conversation Starters
        </Button>

        <div className="space-x-2">
          <Button
            variant="outline"
            disabled={deleteConversationStarter.isPending}
            onClick={() => {
              deleteConversationStarter.mutate(undefined, {
                onSuccess: () => {
                  navigate({
                    to: "/interests/$id",
                    params: { id },
                  })
                },
              })
            }}
          >
            Delete Conversation Starter
          </Button>
          <Button
            variant="outline"
            render={
              <Link
                to="/interests/$id/conversation-starters/$starterId/edit"
                params={{ id, starterId: starter.id }}
              />
            }
            nativeButton={false}
          >
            Edit Conversation Starter
          </Button>
        </div>
      </div>

      <h1 className="text-2xl">{starter.interestName ?? "General"}</h1>
      <p className="py-2">{starter.prompt}</p>
      <p className="text-muted-foreground text-sm">
        Trigger minute: {starter.triggerMinute}
      </p>
    </main>
  )
}
