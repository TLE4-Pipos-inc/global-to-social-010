import { queryOptions, useQuery } from "@tanstack/react-query"
import { fetchWithAuth } from "@/lib/api"

async function fetchUserGroupPhotos() {
  const res = await fetchWithAuth("/api/users/me/groups/photos")

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || "Failed to fetch group memories", {
      cause: errorData.errors,
    })
  }

  return res.json()
}

export const userGroupPhotosQueryOptions = queryOptions({
  queryKey: ["group-photos", "current-user"],
  queryFn: fetchUserGroupPhotos,
  staleTime: 6000,
})

export function useUserGroupPhotosQuery() {
  return useQuery(userGroupPhotosQueryOptions)
}
