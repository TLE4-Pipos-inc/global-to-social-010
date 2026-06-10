import { createFileRoute, Link } from "@tanstack/react-router"
import { FieldGroup } from "#/components/ui/field"
import { Button } from "#/components/ui/button"
import { Spinner } from "#/components/ui/spinner"
import { useInterestForm } from "#/features/interest/hooks/form"
import { useCreateInterest } from "#/features/interest/hooks/query"
import { InterestSchema } from "#/types/interest"
import { toast } from "sonner"

export const Route = createFileRoute("/interests/create")({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const createInterest = useCreateInterest()

  const form = useInterestForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onSubmit: InterestSchema,
    },
    onSubmit: ({ value }) => {
      createInterest.mutate(value, {
        onSuccess: (data) => {
          toast.success("Interest created successfully")
          navigate({
            to: "/interests/$id",
            params: { id: data.result.id },
          })
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to create interest"
          )
        },
      })
    },
  })

  return (
    <>
      <div className="flex items-end justify-between py-2">
        <Button variant="outline">
          <Link to="/interests">Back to Interests</Link>
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
            name="name"
            children={(field) => (
              <field.InputField
                label="Name"
                placeholder="Name"
                autocomplete="name"
              />
            )}
          />
          <Button type="submit" disabled={createInterest.isPending}>
            {createInterest.isPending && <Spinner />}
            {createInterest.isPending ? "Creating..." : "Create Interest"}
          </Button>
        </FieldGroup>
      </form>
    </>
  )
}
