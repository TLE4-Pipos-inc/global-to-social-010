import { checkRole } from "#/lib/route-guard"
import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/conversation-starters")({
  beforeLoad: async ({ location }) => {
    await checkRole(location.pathname, ["admin"])
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Outlet />
    </main>
  )
}
