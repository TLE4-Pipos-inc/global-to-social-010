import { queryOptions, useSuspenseQuery } from "@tanstack/react-query"
import { fetchWithAuth } from "@/lib/api"

async function fetchRoutes() {
  const res = await fetchWithAuth("/api/routes")

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.message, { cause: errorData.errors })
  }

  return res.json()
}

export const RouteQueryOptions = queryOptions({
  queryKey: ["route"],
  queryFn: fetchRoutes,
  staleTime: 6000,
})

export function useRouteQuery() {
  return useSuspenseQuery(RouteQueryOptions)
}
