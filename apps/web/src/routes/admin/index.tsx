import { createFileRoute } from "@tanstack/react-router"
import { Skeleton } from "#/components/ui/skeleton"
import { checkRole } from "#/lib/route-guard"
import { UsersTable } from "#/features/admin/components/users-table"

export const Route = createFileRoute("/admin/")({
  beforeLoad: async ({ location }) => {
    await checkRole(location.pathname, ["admin"])
  },
  pendingMs: 300,
  pendingMinMs: 200,
  pendingComponent: () => <RoutePending />,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: RouteComponent,
})

function RoutePending() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function RouteError({ error }: { error: Error }) {
  return <div>Error loading page: {error.message}</div>
}

function RouteComponent() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Admin Dashboard</h1>
      <UsersTable />
    </div>
  )
}
