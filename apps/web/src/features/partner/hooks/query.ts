import { useAuth } from "#/contexts/auth-context"
import { fetchWithAuth } from "#/lib/api"
import { formatErrorResponse } from "#/lib/api-error"
import type { UpdateData } from "#/types/api"
import type {
  DealCreate,
  DealResponse,
  PartnerResponse,
  VenuePartnershipResponse,
} from "@pub-hopper/schemas"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"

// --- Get the logged-in user's partner profile ---

async function getPartnerByUserId(
  userId: string
): Promise<{ result: { partners: PartnerResponse[] } }> {
  const res = await fetch(`/api/partners?userId=${encodeURIComponent(userId)}`)

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export function useGetMyPartner() {
  const auth = useAuth()
  const userId = auth?.user.id ?? ""

  return useSuspenseQuery({
    queryKey: ["partner", "me", userId],
    queryFn: async () => {
      const data = await getPartnerByUserId(userId)
      return data.result.partners[0] ?? null
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// --- Get a partner's partnerships (their linked venues) ---

async function getPartnerPartnerships(
  partnerId: string
): Promise<{ result: { venuePartnerships: VenuePartnershipResponse[] } }> {
  const res = await fetch(
    `/api/venue-partnerships?partnerId=${encodeURIComponent(partnerId)}`
  )

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export function useGetPartnerPartnerships(partnerId: string) {
  return useSuspenseQuery({
    queryKey: ["venue-partnerships", { partnerId }],
    queryFn: async () => {
      const data = await getPartnerPartnerships(partnerId)
      return data.result.venuePartnerships
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// --- Get a partner's deals ---

async function getPartnerDeals(
  partnerId: string
): Promise<{ result: { deals: DealResponse[] } }> {
  const res = await fetch(`/api/deals?partnerId=${encodeURIComponent(partnerId)}`)

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export function useGetPartnerDeals(partnerId: string) {
  return useSuspenseQuery({
    queryKey: ["deals", { partnerId }],
    queryFn: async () => {
      const data = await getPartnerDeals(partnerId)
      return data.result.deals
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// --- Create a deal ---

async function createDeal(
  data: DealCreate
): Promise<{ result: DealResponse }> {
  const res = await fetchWithAuth("/api/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export function useCreateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
    },
  })
}

// --- Update a deal ---

async function updateDeal({
  id,
  data,
}: {
  id: string
  data: UpdateData<DealUpdateBody>
}): Promise<{ result: DealResponse }> {
  const { id: _id, ...body } = data
  const res = await fetchWithAuth(`/api/deals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

type DealUpdateBody = Partial<Omit<DealCreate, "partnershipId">>

export function useUpdateDeal(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateData<DealUpdateBody>) => updateDeal({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
    },
  })
}

// --- Delete a deal ---

async function deleteDeal(id: string): Promise<void> {
  const res = await fetchWithAuth(`/api/deals/${id}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }
}

export function useDeleteDeal(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteDeal(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["deals"] })
    },
  })
}
