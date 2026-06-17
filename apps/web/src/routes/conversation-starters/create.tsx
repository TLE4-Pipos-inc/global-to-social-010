import { createFileRoute, Link } from "@tanstack/react-router"
import { FieldGroup } from "#/components/ui/field"
import { Button } from "#/components/ui/button"
import { Spinner } from "#/components/ui/spinner"
import { useConversationStarterForm } from "#/features/conversation-starter/hooks/form"
import { useCreateConversationStarter } from "#/features/conversation-starter/hooks/query"
import { getInterestsQueryOptions } from "#/features/interest/hooks/query"
import {
  ConversationStarterCreateSchema,
  triggerMinuteSchema,
} from "@pub-hopper/schemas"
import { toast } from "sonner"
import z from "zod"

const FormSchema = z.object({
  interestsId: ConversationStarterCreateSchema.shape.interestsId.unwrap(),
  prompt: ConversationStarterCreateSchema.shape.prompt,
  triggerMinute: triggerMinuteSchema,
})

export const Route = createFileRoute("/conversation-starters/create")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(getInterestsQueryOptions)
  },
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const createConversationStarter = useCreateConversationStarter()

  const form = useConversationStarterForm({
    defaultValues: {
      interestsId: null as string | null,
      prompt: "",
      triggerMinute: 0,
    },
    validators: {
      onSubmit: FormSchema,
    },
    onSubmit: ({ value }) => {
      createConversationStarter.mutate(
        { ...value },
        {
          onSuccess: (data) => {
            toast.success("Conversation starter created successfully")
            navigate({
              to: "/conversation-starters/$id",
              params: { id: data.result.id },
            })
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to create conversation starter"
            )
          },
        }
      )
    },
  })

  return (
    <>
      <div className="flex items-end justify-between py-2">
        <Button variant="outline" render={<Link to="/conversation-starters" />} nativeButton={false}>
          Back to Conversation Starters
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
            name="interestsId"
            children={(field) => <field.InterestSelectField label="Category" />}
          />
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
          <Button
            type="submit"
            disabled={createConversationStarter.isPending}
          >
            {createConversationStarter.isPending && <Spinner />}
            {createConversationStarter.isPending
              ? "Creating..."
              : "Create Conversation Starter"}
          </Button>
        </FieldGroup>
      </form>
    </>
  )
}
