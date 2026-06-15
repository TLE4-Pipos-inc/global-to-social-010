import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { FormDevtoolsPanel } from '@tanstack/react-form-devtools'

import type { QueryClient } from "@tanstack/react-query"
import { Toaster } from "#/components/ui/sonner"

import "../styles.css"
import { Header } from "#/components/layout/header"
import { AuthProvider } from "#/contexts/auth-context"
import { restoreSession } from "#/lib/auth-store"

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    await restoreSession()
  },
  component: RootComponent,
})

function RootComponent() {
  return (
    <AuthProvider>
      <Toaster />
      <Header />
      <Outlet />
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
          {
            name: "Tanstack Query",
            render: <ReactQueryDevtoolsPanel />,
          },
          {
            name: "Tanstack Form",
            render: <FormDevtoolsPanel />,
          }
        ]}
      />
    </AuthProvider>
  )
}
