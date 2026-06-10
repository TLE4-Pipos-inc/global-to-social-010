import { createFileRoute, Link } from "@tanstack/react-router"
import {
  useGetConversationStarterById,
  useUpdateConversationStarter,
} from "#/features/conversation-starter/hooks/query"
import { FieldGroup } from "#/components/ui/field"
import { Button } from "#/components/ui/button"
import {
  ConversationStarterCreateSchema,
  triggerMinuteSchema,
} from "@pub-hopper/schemas"
import { useConversationStarterForm } from "#/features/conversation-starter/hooks/form"
import { toast } from "sonner"
import { Spinner } from "#/components/ui/spinner"
import z from "zod"

const FormSchema = z.object({
  prompt: ConversationStarterCreateSchema.shape.prompt,
  triggerMinute: triggerMinuteSchema,
})

export const Route = createFileRoute("/conversation-starters/$id/edit")({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const navigate = Route.useNavigate()
  const getConversationStarter = useGetConversationStarterById(id)
  const updateConversationStarter = useUpdateConversationStarter(id)

  const starter = getConversationStarter.data.result

  const form = useConversationStarterForm({
    defaultValues: {
      prompt: starter.prompt,
      triggerMinute: starter.triggerMinute,
    },
    validators: {
      onSubmit: FormSchema,
    },
    onSubmit: ({ value }) => {
      updateConversationStarter.mutate(
        { id: starter.id, ...value },
        {
          onSuccess: (data) => {
            toast.success("Conversation starter updated successfully")
            navigate({
              to: "/conversation-starters/$id",
              params: { id: data.result.id },
            })
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to update conversation starter"
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
          render={<Link to="/conversation-starters/$id" params={{ id: starter.id }} />}
          nativeButton={false}
        >
          Back to conversation starter
        </Button>
        <Button
          type="submit"
          form="update-conversation-starter"
          disabled={updateConversationStarter.isPending}
        >
          {updateConversationStarter.isPending && <Spinner />}
          {updateConversationStarter.isPending
            ? "Updating..."
            : "Update Conversation Starter"}
        </Button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        id="update-conversation-starter"
      >
        <FieldGroup>
          <form.AppField
            name="prompt"
            children={(field) => (
              <field.TextAreaField
                label="Prompt"
                placeholder="Prompt"
                maxCharacters="500"
              />
            )}
          />
          <form.AppField
            name="triggerMinute"
            children={(field) => (
              <field.TriggerMinuteField label="Trigger Minute" />
            )}
          />
        </FieldGroup>
      </form>
    </>
  )
}
