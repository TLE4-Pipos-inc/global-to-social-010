import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { Button } from "#/components/ui/button"
import { FieldGroup } from "#/components/ui/field"
import { Spinner } from "#/components/ui/spinner"
import { toast } from "sonner"
import { useMutation } from "@tanstack/react-query"
import { useAccountForm } from "#/features/auth/hooks/form"
import { getAccessToken, setAuth } from "#/lib/auth-store"
import type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
} from "#/types/api"
import {
  UserLoginSchema,
  type LoginResponse,
  type UserLogin,
} from "@pub-hopper/schemas"
import z from "zod"

export const Route = createFileRoute("/(auth)/login")({
  beforeLoad: () => {
    if (getAccessToken()) {
      throw redirect({ to: "/" })
    }
  },
  validateSearch: z.object({
    location: z.string().optional(),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = Route.useNavigate()
  const { location } = Route.useSearch()

  const mutation = useMutation({
    mutationFn: async (
      value: UserLogin
    ): Promise<ApiSuccessResponse<LoginResponse>> => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(value),
      })

      const json = (await response.json()) as ApiResponse<LoginResponse>

      if (!response.ok) {
        throw new Error((json as ApiErrorResponse).message || "Login failed")
      }

      return json as ApiSuccessResponse<LoginResponse>
    },
    onSuccess: ({ result }) => {
      setAuth(result)
      toast.success("Logged in successfully!")
      navigate({ to: location || "/" })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const form = useAccountForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: UserLoginSchema,
    },
    onSubmit: async ({ value }) => {
      mutation.mutate(value)
    },
  })
  return (
    <main className="my-auto flex h-screen items-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Log In</CardTitle>
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
                    autocomplete="password"
                  />
                )}
              />
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Spinner />}
                {mutation.isPending ? "Logging in..." : "Log In"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <span>Don't have an account?</span>
          <Button
            variant="link"
            className="text-background"
            render={<Link to="/register" />}
            nativeButton={false}
          >
            Sign up
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
