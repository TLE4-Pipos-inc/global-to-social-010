import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { fetchWithAuth } from '../../../lib/api'

async function fetchAccount() {
  const res = await fetchWithAuth('/api/auth/me')

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.message, { cause: errorData.errors })
  }

  return res.json()
}

export const accountQueryOptions = queryOptions({
  queryKey: ['account'],
  queryFn: fetchAccount,
  staleTime: Infinity,
})

export function useAccountQuery() {
  return useSuspenseQuery(accountQueryOptions)
}
