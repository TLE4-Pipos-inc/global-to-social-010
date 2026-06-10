import { createFileRoute, Link } from "@tanstack/react-router"
import {
  useDeleteInterest,
  useGetInterestById,
} from "#/features/interest/hooks/query"
import { Button } from "#/components/ui/button"

export const Route = createFileRoute("/interests/$id/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const getInterest = useGetInterestById(id)
  const deleteInterest = useDeleteInterest(id)
  const navigate = Route.useNavigate()

  const interest = getInterest.data.result

  return (
    <main>
      <div className="flex items-end justify-between py-2">
        <Button variant="outline">
          <Link to="/interests">Back to Interests</Link>
        </Button>

        <div className="space-x-2">
          <Button
            variant="outline"
            disabled={deleteInterest.isPending}
            onClick={() => {
              deleteInterest.mutate(undefined, {
                onSettled: () => {
                  navigate({ to: "/interests" })
                },
              })
            }}
          >
            Delete Interest
          </Button>
          <Button variant="outline">
            <Link to="/interests/$id/edit" params={{ id: interest.id }}>
              Edit Interest
            </Link>
          </Button>
        </div>
      </div>

      <h1 className="text-2xl">{interest.name}</h1>
    </main>
  )
}
