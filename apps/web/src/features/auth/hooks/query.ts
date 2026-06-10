import { queryOptions, useSuspenseQuery } from "@tanstack/react-query"
import { fetchWithAuth } from "#/lib/api"
import type { ApiErrorResponse, ApiSuccessResponse } from "#/types/api"
import type { UserResponse } from "@pub-hopper/schemas"

async function fetchAccount(): Promise<ApiSuccessResponse<UserResponse>> {
  const res = await fetchWithAuth("/api/auth/me")

  if (!res.ok) {
    const errorData = (await res.json()) as ApiErrorResponse
    console.log(errorData.message)
    throw new Error(errorData.message, { cause: errorData.errors })
  }

  return res.json()
}

export const accountQueryOptions = queryOptions({
  queryKey: ["account"],
  queryFn: fetchAccount,
  staleTime: Infinity,
})

export function useAccountQuery() {
  return useSuspenseQuery(accountQueryOptions)
}
