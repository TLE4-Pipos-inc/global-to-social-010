import { queryOptions, useSuspenseQuery } from "@tanstack/react-query"
import { fetchWithAuth } from "@/lib/api"

async function fetchUserInterest() {
  const res = await fetchWithAuth("/api/user-interests")

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.message, { cause: errorData.errors })
  }

  return res.json()
}

export const userInterestQueryOptions = queryOptions({
  queryKey: ["userInterest"],
  queryFn: fetchUserInterest,
  staleTime: 5000,
})

export function useUserInterestQuery() {
  return useSuspenseQuery(userInterestQueryOptions)
}
