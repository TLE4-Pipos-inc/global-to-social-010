import type { LoginResponse } from "@pub-hopper/schemas"
import type { ApiSuccessResponse } from "#/types/api"

type AuthState = LoginResponse | null

let authState: AuthState = null
let restoreAttempted = false
const listeners = new Set<() => void>()

function getAuth(): AuthState {
  return authState
}

function setAuth(auth: AuthState): void {
  authState = auth
  listeners.forEach((listener) => listener())
}

function getAccessToken(): string | null {
  return authState?.token ?? null
}

function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
    if (!res.ok) return false

    const { result } = (await res.json()) as ApiSuccessResponse<LoginResponse>
    setAuth(result)
    return true
  } catch {
    return false
  }
}

async function restoreSession(): Promise<void> {
  if (authState || restoreAttempted) return
  restoreAttempted = true

  await refreshToken()
}

export { getAuth, setAuth, getAccessToken, subscribeAuth, restoreSession, refreshToken }
