import { createFileRoute, Link } from "@tanstack/react-router"
import { Skeleton } from "#/components/ui/skeleton"
import { Button } from "#/components/ui/button"
import { checkAuth } from "#/lib/route-guard"
import {
  accountQueryOptions,
  useAccountQuery,
} from "#/features/auth/hooks/query"

export const Route = createFileRoute("/(auth)/account")({
  beforeLoad: async ({ location }) => {
    await checkAuth(location.pathname)
  },
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(accountQueryOptions)
  },
  pendingMs: 300,
  pendingMinMs: 200,
  pendingComponent: () => <RoutePending />,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: RouteComponent,
})

function RoutePending() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-end justify-between py-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-2 h-6 w-48" />
    </main>
  )
}

function RouteError({ error }: { error: Error }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center">
        Error loading account information: {error.message}
      </div>
    </main>
  )
}

function RouteComponent() {
  const accountQuery = useAccountQuery()
  console.log("Account data:", accountQuery.data)
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-end justify-between py-2">
        <h1 className="text-2xl">Account</h1>

        <Button variant="outline">
          <Link to="/logout">Logout</Link>
        </Button>
      </div>
      <p>
        <strong>Name:</strong> {accountQuery.data.result.name}
      </p>
      <p>
        <strong>Email:</strong> {accountQuery.data.result.email}
      </p>
      <div className="flex gap-4 pt-4">
        <p>
          <strong>Created At:</strong>{" "}
          {new Date(accountQuery.data.result.createdAt).toLocaleDateString()}
        </p>
        <p>
          <strong>Updated At:</strong>{" "}
          {new Date(accountQuery.data.result.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <p>
        <strong>Id:</strong> {accountQuery.data.result.id}
      </p>
    </main>
  )
}
