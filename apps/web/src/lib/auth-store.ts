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

async function restoreSession(): Promise<void> {
  if (authState || restoreAttempted) return
  restoreAttempted = true

  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
    if (!res.ok) return

    const { result } = (await res.json()) as ApiSuccessResponse<LoginResponse>
    setAuth(result)
  } catch {
    // not logged in, leave authState as null
  }
}

export { getAuth, setAuth, getAccessToken, subscribeAuth, restoreSession }
