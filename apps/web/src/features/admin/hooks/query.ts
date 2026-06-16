import { fetchWithAuth } from "#/lib/api"
import { formatErrorResponse } from "#/lib/api-error"
import type { ApiSuccessResponse } from "#/types/api"
import type {
  AdminUpdateUser,
  PartnerCreate,
  PartnerResponse,
  UserResponse,
  VenuePartnershipCreate,
  VenuePartnershipResponse,
} from "@pub-hopper/schemas"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"

// Re-export the venue query so admin components can use the shared selector.
export { useGetVenues } from "#/features/venue/hooks/query"

// --- Get all users ---

async function getUsers(): Promise<{ result: { users: UserResponse[] } }> {
  const res = await fetchWithAuth("/api/users")

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export function useGetUsers() {
  return useSuspenseQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const data = await getUsers()
      return data.result.users
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// --- Update a user (role / profile) ---

async function updateUser({
  id,
  data,
}: {
  id: string
  data: AdminUpdateUser
}): Promise<ApiSuccessResponse<UserResponse>> {
  const res = await fetchWithAuth(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AdminUpdateUser) => updateUser({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

// --- Find a user's partner profile (existence check before linking) ---

async function getPartnerByUserId(
  userId: string
): Promise<{ result: { partners: PartnerResponse[] } }> {
  const res = await fetch(`/api/partners?userId=${encodeURIComponent(userId)}`)

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export async function findPartnerByUserId(
  userId: string
): Promise<PartnerResponse | null> {
  const data = await getPartnerByUserId(userId)
  return data.result.partners[0] ?? null
}

// --- Create a partner profile ---

export async function createPartner(
  data: PartnerCreate
): Promise<PartnerResponse> {
  const res = await fetchWithAuth("/api/partners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  const json: ApiSuccessResponse<PartnerResponse> = await res.json()
  return json.result
}

// --- Create a partnership (pure partner <-> venue link) ---

export async function createPartnership(
  data: VenuePartnershipCreate
): Promise<VenuePartnershipResponse> {
  const res = await fetchWithAuth("/api/venue-partnerships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  const json: ApiSuccessResponse<VenuePartnershipResponse> = await res.json()
  return json.result
}

// --- Find an existing partnership for a partner + venue ---

async function findPartnership(
  partnerId: string,
  venueId: string
): Promise<VenuePartnershipResponse | null> {
  const res = await fetch(
    `/api/venue-partnerships?partnerId=${encodeURIComponent(partnerId)}`
  )

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  const json: { result: { venuePartnerships: VenuePartnershipResponse[] } } =
    await res.json()
  return json.result.venuePartnerships.find((p) => p.venueId === venueId) ?? null
}

// --- Orchestrated link: ensure partner profile, create partnership, set role ---

export function useLinkUserToVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      currentRole,
      organizationName,
      partnershipType,
      venueId,
    }: {
      userId: string
      currentRole: string
      organizationName: string
      partnershipType: string
      venueId: string
    }) => {
      const existingPartner = await findPartnerByUserId(userId)
      const partner =
        existingPartner ??
        (await createPartner({ userId, organizationName, partnershipType }))

      // Reuse an existing partnership instead of hitting the unique constraint.
      const existingPartnership = await findPartnership(partner.id, venueId)
      if (!existingPartnership) {
        await createPartnership({ venueId, partnerId: partner.id })
      }

      if (currentRole !== "partner") {
        await updateUser({ id: userId, data: { role: "partner" } })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["venue-partnerships"] })
    },
  })
}
