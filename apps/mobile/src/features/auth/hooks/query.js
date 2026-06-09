import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { fetchWithAuth } from '@/lib/api'
import { setAccessToken } from '@/lib/token'
import { API_URL } from '@/constants/api'

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

async function performLogout() {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: performLogout,
    onSettled: () => {
      setAccessToken(null)
      queryClient.clear()
    },
  })
}

async function updateUser(body) {
  const res = await fetchWithAuth('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error('Could not save profile')
  }

  return res.json()
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateUser,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
    },
  })
}
