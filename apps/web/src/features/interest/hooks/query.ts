import { fetchWithAuth } from "#/lib/api"
import { formatErrorResponse } from "#/lib/api-error"
import type { ApiSuccessResponse, UpdateData } from "#/types/api"
import type { InterestCreate, InterestResponse } from "@pub-hopper/schemas"
import {
  QueryClient,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"

// --- Get all ---

async function getInterests(): Promise<ApiSuccessResponse<InterestResponse[]>> {
  const res = await fetch("/api/interests")

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export const getInterestsQueryOptions = {
  queryKey: ["interests"],
  queryFn: getInterests,
  staleTime: 1000 * 60 * 5, // 5 minutes
}

export function useGetInterests() {
  return useSuspenseQuery(getInterestsQueryOptions)
}

// --- Get by ID ---

async function getInterestById(
  id: string
): Promise<ApiSuccessResponse<InterestResponse>> {
  const res = await fetch(`/api/interests/${id}`)

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export const getInterestByIdQueryOptions = (id: string) => ({
  queryKey: ["interests", id],
  queryFn: () => getInterestById(id),
  staleTime: 1000 * 60 * 5, // 5 minutes
  enabled: !!id,
})

export function useGetInterestById(id: string) {
  return useSuspenseQuery(getInterestByIdQueryOptions(id))
}

// --- Create ---

async function createInterest(
  data: InterestCreate
): Promise<ApiSuccessResponse<InterestResponse>> {
  const res = await fetchWithAuth("/api/interests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export const createInterestMutationOptions = {
  mutationFn: createInterest,
}

export function useCreateInterest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createInterest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interests"] })
    },
  })
}

// --- Update ---

async function updateInterest({
  id,
  data,
}: {
  id: string
  data: UpdateData<InterestCreate>
}): Promise<ApiSuccessResponse<InterestResponse>> {
  const res = await fetchWithAuth(`/api/interests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export const updateInterestMutationOptions = (
  id: string,
  queryClient: QueryClient
) => ({
  mutationFn: (data: UpdateData<InterestCreate>) => updateInterest({ id, data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["interests"] })
    queryClient.invalidateQueries({ queryKey: ["interests", id] })
  },
})

export function useUpdateInterest(id: string) {
  const queryClient = useQueryClient()

  return useMutation(updateInterestMutationOptions(id, queryClient))
}

// --- Delete ---

async function deleteInterest(id: string): Promise<void> {
  const res = await fetchWithAuth(`/api/interests/${id}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }
}

export const deleteInterestMutationOptions = (
  id: string,
  queryClient: QueryClient
) => ({
  mutationFn: () => deleteInterest(id),
  onSuccess: async () => {
    await queryClient.refetchQueries({
      queryKey: ["interests"],
      exact: true,
    })
  },
})

export function useDeleteInterest(id: string) {
  const queryClient = useQueryClient()
  return useMutation(deleteInterestMutationOptions(id, queryClient))
}
