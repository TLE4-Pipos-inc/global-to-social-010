import { queryOptions, useSuspenseQuery } from "@tanstack/react-query"
import { fetchWithAuth } from "@/lib/api"

async function fetchRoutes() {
  const res = await fetchWithAuth("/api/thema-route")

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.message, { cause: errorData.errors })
  }

  return res.json()
}

export const ThemeQueryOptions = queryOptions({
  queryKey: ["theme"],
  queryFn: fetchThemes,
  staleTime: 6000,
})

export function useThemeQuery() {
  return useSuspenseQuery(ThemeQueryOptions)
}
