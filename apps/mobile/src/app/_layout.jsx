import { Stack, useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { API_URL } from "@/constants/api"
import { getAccessToken, setAccessToken } from "@/lib/token"
import { Montserrat_700Bold } from "@expo-google-fonts/montserrat"
import { useFonts } from "expo-font"
import { SocketProvider } from "@/features/matchmaking/socket-context"

const queryClient = new QueryClient()

export const unstable_settings = {
  anchor: "(tabs)",
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
  })
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function bootstrap() {
      if (!getAccessToken()) {
        try {
          const res = await fetch(`${API_URL}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
          })
          if (res.ok) {
            const { result } = await res.json()
            setAccessToken(result.token)
          }
        } catch {}
      }
      setReady(true)
    }
    bootstrap()
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!getAccessToken()) router.replace("/(auth)/login")
  }, [ready, router])

  if (!ready || !fontsLoaded) return null

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="dark" />
      </SocketProvider>
    </QueryClientProvider>
  )
}
