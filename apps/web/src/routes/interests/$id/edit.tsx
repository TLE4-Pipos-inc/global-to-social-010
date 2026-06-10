import { createFileRoute, Link } from "@tanstack/react-router"
import {
  useGetInterestById,
  useUpdateInterest,
} from "../../../features/interest/hooks/query"
import { FieldGroup } from "#/components/ui/field"
import { Button } from "#/components/ui/button"
import { InterestCreateSchema } from "@pub-hopper/schemas"
import { useInterestForm } from "../../../features/interest/hooks/form"
import { toast } from "sonner"
import { Spinner } from "#/components/ui/spinner"

export const Route = createFileRoute("/interests/$id/edit")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const navigate = Route.useNavigate()
  const getInterest = useGetInterestById(id)
  const updateInterest = useUpdateInterest(id)

  const interest = getInterest.data.result

  const form = useInterestForm({
    defaultValues: {
      name: interest.name,
    },
    validators: {
      onSubmit: InterestCreateSchema,
    },
    onSubmit: ({ value }) => {
      updateInterest.mutate(
        { id: interest.id, ...value },
        {
          onSuccess: (data) => {
            toast.success("Interest updated successfully")
            navigate({
              to: "/interests/$id",
              params: { id: data.result.id },
            })
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to update interest"
            )
          },
        }
      )
    },
  })

  return (
    <>
      <div className="flex items-end justify-between py-2">
        <Button
          variant="outline"
          render={<Link to="/interests/$id" params={{ id: interest.id }} />}
          nativeButton={false}
        >
          Back to interest
        </Button>
        <Button
          type="submit"
          form="update-interest"
          disabled={updateInterest.isPending}
        >
          {updateInterest.isPending && <Spinner />}
          {updateInterest.isPending ? "Updating..." : "Update Interest"}
        </Button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        id="update-interest"
      >
        <FieldGroup>
          <form.AppField
            name="name"
            children={(field) => (
              <field.InputField
                label="Name"
                placeholder="Name"
                autocomplete="name"
              />
            )}
          />
        </FieldGroup>
      </form>
    </>
  )
}
