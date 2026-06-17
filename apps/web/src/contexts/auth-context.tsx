import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import type { LoginResponse, UserRole } from "@pub-hopper/schemas"
import { getAuth, subscribeAuth } from "#/lib/auth-store"

const AuthContext = createContext<LoginResponse | null | undefined>(undefined)

function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSyncExternalStore(subscribeAuth, getAuth, getAuth)

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

function useAuth(): LoginResponse | null {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

function useIsAuthenticated(): boolean {
  return useAuth() !== null
}

function useHasRole(roles: UserRole[]): boolean {
  const auth = useAuth()
  return auth !== null && roles.includes(auth.user.role)
}

export { AuthProvider, useAuth, useIsAuthenticated, useHasRole }
