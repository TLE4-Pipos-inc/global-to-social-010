import type { UserRole } from "@pub-hopper/schemas"
import { getAccessToken, getAuth, refreshToken } from "./auth-store"
import { redirect } from "@tanstack/react-router"

async function checkAuth(location: string): Promise<void> {
  if (!getAccessToken()) {
    const refreshed = await refreshToken()
    if (!refreshed) {
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
