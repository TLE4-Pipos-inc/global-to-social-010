import { fetchWithAuth } from "#/lib/api"
import { formatErrorResponse } from "#/lib/api-error"
import type { ApiSuccessResponse, UpdateData } from "#/types/api"
import type { Interest, InterestResponse } from "#/types/interest"
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
  data: Interest
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
  data: UpdateData<Interest>
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
  mutationFn: (data: UpdateData<Interest>) => updateInterest({ id, data }),
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

async function deleteInterest(
  id: string
): Promise<ApiSuccessResponse<InterestResponse>> {
  const res = await fetchWithAuth(`/api/interests/${id}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export const deleteInterestMutationOptions = (
  id: string,
  queryClient: QueryClient
) => ({
  mutationFn: () => deleteInterest(id),
  // TODO: Should be async but then the other success callback does not seem to work, now there is a very small flicker because the query has not been invalidated
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["interests"] })
  },
})

export function useDeleteInterest(id: string) {
  const queryClient = useQueryClient()
  return useMutation(deleteInterestMutationOptions(id, queryClient))
}
