import { fetchWithAuth } from "#/lib/api"
import { formatErrorResponse } from "#/lib/api-error"
import type { ApiSuccessResponse, UpdateData } from "#/types/api"
import type {
  ConversationStarter,
  ConversationStarterCreate,
} from "@pub-hopper/schemas"
import {
  QueryClient,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"

type ConversationStarterFilters = {
  interestsId?: string | null
}

function filtersToSearchParams(filters?: ConversationStarterFilters): string {
  if (!filters || filters.interestsId === undefined) {
    return ""
  }

  const value = filters.interestsId === null ? "null" : filters.interestsId
  return `?${new URLSearchParams({ interestsId: value }).toString()}`
}

// --- Get all ---

async function getConversationStarters(
  filters?: ConversationStarterFilters
): Promise<ApiSuccessResponse<{ conversationStarters: ConversationStarter[] }>> {
  const res = await fetch(
    `/api/conversation-starters${filtersToSearchParams(filters)}`
  )

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export const getConversationStartersQueryOptions = (
  filters?: ConversationStarterFilters
) => ({
  queryKey: ["conversation-starters", "list", filters ?? {}],
  queryFn: () => getConversationStarters(filters),
  staleTime: 1000 * 60 * 5, // 5 minutes
})

export function useGetConversationStarters(
  filters?: ConversationStarterFilters
) {
  return useSuspenseQuery(getConversationStartersQueryOptions(filters))
}

// --- Get by ID ---

async function getConversationStarterById(
  id: string
): Promise<ApiSuccessResponse<ConversationStarter>> {
  const res = await fetch(`/api/conversation-starters/${id}`)

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export const getConversationStarterByIdQueryOptions = (id: string) => ({
  queryKey: ["conversation-starters", "detail", id],
  queryFn: () => getConversationStarterById(id),
  staleTime: 1000 * 60 * 5, // 5 minutes
  enabled: !!id,
})

export function useGetConversationStarterById(id: string) {
  return useSuspenseQuery(getConversationStarterByIdQueryOptions(id))
}

// --- Create ---

async function createConversationStarter(
  data: ConversationStarterCreate
): Promise<ApiSuccessResponse<ConversationStarter>> {
  const res = await fetchWithAuth("/api/conversation-starters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export function useCreateConversationStarter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createConversationStarter,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-starters", "list"],
      })
    },
  })
}

// --- Update ---

async function updateConversationStarter({
  id,
  data,
}: {
  id: string
  data: UpdateData<ConversationStarterCreate>
}): Promise<ApiSuccessResponse<ConversationStarter>> {
  const res = await fetchWithAuth(`/api/conversation-starters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export const updateConversationStarterMutationOptions = (
  id: string,
  queryClient: QueryClient
) => ({
  mutationFn: (data: UpdateData<ConversationStarterCreate>) =>
    updateConversationStarter({ id, data }),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["conversation-starters", "list"],
    })
    queryClient.invalidateQueries({
      queryKey: ["conversation-starters", "detail", id],
    })
  },
})

export function useUpdateConversationStarter(id: string) {
  const queryClient = useQueryClient()

  return useMutation(updateConversationStarterMutationOptions(id, queryClient))
}

// --- Delete ---

async function deleteConversationStarter(id: string): Promise<void> {
  const res = await fetchWithAuth(`/api/conversation-starters/${id}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }
}

export const deleteConversationStarterMutationOptions = (
  id: string,
  queryClient: QueryClient
) => ({
  mutationFn: () => deleteConversationStarter(id),
  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: ["conversation-starters", "list"],
    })
  },
})

export function useDeleteConversationStarter(id: string) {
  const queryClient = useQueryClient()
  return useMutation(deleteConversationStarterMutationOptions(id, queryClient))
}
