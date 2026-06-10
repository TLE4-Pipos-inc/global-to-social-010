import { Button } from "#/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { FieldGroup } from "#/components/ui/field"
import { Spinner } from "#/components/ui/spinner"

import { useMutation } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { toast } from "sonner"
import { useAccountForm } from "../../features/auth/hooks/form"
import { UserRegisterSchema, type UserRegister } from "@pub-hopper/schemas"

export const Route = createFileRoute("/(auth)/register")({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()

  const mutation = useMutation({
    mutationFn: (value: UserRegister) =>
      fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(value),
      }),
    onSuccess: () => {
      toast.success("Created account successfully!")
      navigate({ to: "/login" })
    },
    onError: (err: Error) => {
      console.error(err, "Registration error")
      toast.error(err.message)
    },
  })

  const form = useAccountForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: UserRegisterSchema,
    },
    onSubmit: async ({ value }) => {
      mutation.mutate(value)
    },
  })

  return (
    <main className="my-auto flex h-screen items-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
        </CardHeader>
        <CardContent>
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

              <form.AppField
                name="email"
                children={(field) => (
                  <field.InputField
                    label="Email"
                    placeholder="Email"
                    autocomplete="email"
                  />
                )}
              />

              <form.AppField
                name="password"
                children={(field) => (
                  <field.InputField
                    label="Password"
                    placeholder="Password"
                    type="password"
                    autocomplete="new-password"
                  />
                )}
              />

              {/* TODO: Check if there is a better way to do this */}
              <form.AppField
                name="confirmPassword"
                validators={{
                  onChangeListenTo: ["password"],
                  onChange: ({ value, fieldApi }) => {
                    const pw = fieldApi.form.getFieldValue("password")
                    if (pw && value !== pw) {
                      return { message: "Passwords do not match" }
                    }
                    return undefined
                  },
                }}
                children={(field) => (
                  <field.InputField
                    label="Confirm Password"
                    type="password"
                    autocomplete="new-password"
                    placeholder="Confirm Password"
                  />
                )}
              />
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Spinner />}
                {mutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <span>Already have an account?</span>
          <Button variant="link">
            <Link to="/login">Log in</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
