import { fetchWithAuth } from "#/lib/api"
import { formatErrorResponse } from "#/lib/api-error"
import type { ApiSuccessResponse } from "#/types/api"
import type { VenueCreate, VenueResponse } from "@pub-hopper/schemas"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"

// --- Get all venues (for venue display lookup) ---

async function getVenues(): Promise<{ result: { venues: VenueResponse[] } }> {
  const res = await fetch("/api/venues")

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export function useGetVenues() {
  return useSuspenseQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const data = await getVenues()
      return data.result.venues
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// --- Get a single venue ---

async function getVenueById(
  id: string
): Promise<ApiSuccessResponse<VenueResponse>> {
  const res = await fetch(`/api/venues/${id}`)

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export function useGetVenueById(id: string) {
  return useSuspenseQuery({
    queryKey: ["venues", id],
    queryFn: () => getVenueById(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// --- Update a venue ---

async function updateVenue({
  id,
  data,
}: {
  id: string
  data: Partial<VenueCreate>
}): Promise<ApiSuccessResponse<VenueResponse>> {
  const res = await fetchWithAuth(`/api/venues/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    await formatErrorResponse(res)
  }

  return res.json()
}

export function useUpdateVenue(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<VenueCreate>) => updateVenue({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] })
      queryClient.invalidateQueries({ queryKey: ["venues", id] })
    },
  })
}
