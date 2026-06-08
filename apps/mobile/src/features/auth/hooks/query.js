import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { fetchWithAuth } from '@/lib/api'
import { setAccessToken } from '@/lib/token'

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

async function fetchDeleteAccount() {
  const res = await fetchWithAuth('/api/auth/me', { method: 'DELETE' })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.message)
  }
  return res.json()
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fetchDeleteAccount,
    onSettled: () => {
      setAccessToken(null)
      queryClient.removeQueries({ queryKey: ['account'] })
      router.replace('/(auth)/login')
    },
  })
}
