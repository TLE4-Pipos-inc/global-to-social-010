import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { Suspense } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAccountQuery } from "../../features/auth/hooks/query"
import { setAccessToken } from "../../lib/token"
import { API_URL } from "../../constants/api"
import { PrimaryDarkOutlineButton } from "../../components/buttons"
import { Colors } from "../../constants/theme"

function ProfileContent() {
  const { data } = useAccountQuery()
  const queryClient = useQueryClient()

  const logout = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      }),
    onSettled: () => {
      setAccessToken(null)
      queryClient.removeQueries({ queryKey: ["account"] })
      router.replace("/(auth)/login")
    },
  })
  const user = data.user

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <PrimaryDarkOutlineButton
        title={logout.isPending ? "Logging out…" : "Log Out"}
        disabled={logout.isPending}
        onPress={() => logout.mutate()}
      />
    </View>
  )
}

export default function ProfileScreen() {
  return (
    <Suspense fallback={<ActivityIndicator style={styles.loader} />}>
      <ProfileContent />
    </Suspense>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: Colors.background,
    justifyContent: "space-between",
  },
  info: {
    gap: 6,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
  },
  email: {
    fontSize: 16,
    color: Colors.icon,
  },
  loader: {
    flex: 1,
  },
})
