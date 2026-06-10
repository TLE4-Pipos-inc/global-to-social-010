import { getAccessToken, refreshToken, setAuth } from "./auth-store"
import { redirect } from "@tanstack/react-router"

// TODO: Refactor this, check for react query's built in retry logic and error handling
function authHeader(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  let response = await fetch(input, {
    ...init,
    credentials: "include", // sends the httpOnly cookie automatically
    headers: {
      ...init?.headers,
      ...authHeader(),
    },
  })

  // access token expired — try to refresh once
  if (response.status === 401) {
    const refreshed = await refreshToken()

    if (refreshed) {
      // retry the original request with new token
      response = await fetch(input, {
        ...init,
        credentials: "include",
        headers: {
          ...init?.headers,
          ...authHeader(),
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
