import { router } from "expo-router"
import { API_URL } from "@/constants/api"
import { getAccessToken, setAccessToken } from "@/lib/token"

// TODO: check for react query's built in retry logic and error handling
async function fetchWithAuth(path, init) {
  const url = `${API_URL}${path}`

  let response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })

  if (response.status === 401) {
    const refreshed = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })

    if (refreshed.ok) {
      const { token } = await refreshed.json()
      setAccessToken(token)

      response = await fetch(url, {
        ...init,
        credentials: "include",
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${token}`,
        },
      })
    } else {
      setAccessToken(null)
      router.replace("/(auth)/login")
    }
  }

  return response
}

export { fetchWithAuth }
