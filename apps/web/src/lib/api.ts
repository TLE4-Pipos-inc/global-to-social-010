import { getAccessToken, setAuth } from "./auth-store"
import { redirect } from "@tanstack/react-router"
import type { ApiSuccessResponse } from "#/types/api"
import type { LoginResponse } from "@pub-hopper/schemas"

// TODO: Refactor this, check for react query's built in retry logic and error handling
async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  let response = await fetch(input, {
    ...init,
    credentials: "include", // sends the httpOnly cookie automatically
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })

  // access token expired — try to refresh once
  if (response.status === 401) {
    const refreshed = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include", // sends the refresh cookie
    })

    if (refreshed.ok) {
      const { result } = (await refreshed.json()) as ApiSuccessResponse<LoginResponse>
      setAuth(result)

      // retry the original request with new token
      response = await fetch(input, {
        ...init,
        credentials: "include",
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${result.token}`,
        },
      })
    } else {
      // refresh token also expired - send to login
      setAuth(null)
      redirect({
        to: "/login",
        // TODO: don't use window.location.pathname here, use the router's current location instead
        search: { location: window.location.pathname },
      })
    }
  }

  return response
}

export { fetchWithAuth }
