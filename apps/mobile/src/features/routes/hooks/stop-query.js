import { queryOptions, useSuspenseQuery } from "@tanstack/react-query"
import { fetchWithAuth } from "@/lib/api"

async function fetchStops() {
  const res = await fetchWithAuth("/api/route-stops")

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.message, { cause: errorData.errors })
  }

  return res.json()
}

export const StopQueryOptions = queryOptions({
  queryKey: ["stop"],
  queryFn: fetchStops,
  staleTime: 6000,
})

export function useStopQuery() {
  return useSuspenseQuery(StopQueryOptions)
}
