import { queryOptions, useSuspenseQuery } from "@tanstack/react-query"
import { fetchWithAuth } from "@/lib/api"

async function fetchInterest() {
  const res = await fetchWithAuth("/api/interests")

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.message, { cause: errorData.errors })
  }

  return res.json()
}

export const interestQueryOptions = queryOptions({
  queryKey: ["interest"],
  queryFn: fetchInterest,
  staleTime: 6000,
})

export function useInterestQuery() {
  return useSuspenseQuery(interestQueryOptions)
}
