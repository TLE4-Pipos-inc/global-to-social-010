import type { ApiSuccessResponse } from "#/types/api"
import type { LoginResponse, UserRole } from "@pub-hopper/schemas"
import { getAccessToken, getAuth, setAuth } from "./auth-store"
import { redirect } from "@tanstack/react-router"

async function checkAuth(location: string): Promise<void> {
  if (!getAccessToken()) {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      if (!res.ok) {
        throw new Error("Failed to refresh token")
      }
      const { result } = (await res.json()) as ApiSuccessResponse<LoginResponse>
      setAuth(result)
    } catch {
      throw redirect({ to: "/login", search: { location } })
    }
  }
}

async function checkRole(location: string, roles: UserRole[]): Promise<void> {
  await checkAuth(location)

  const auth = getAuth()
  if (!auth || !roles.includes(auth.user.role)) {
    throw redirect({ to: "/", search: { location } })
  }
}

export { checkAuth, checkRole }
