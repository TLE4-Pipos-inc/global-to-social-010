import { Image } from "expo-image"
import { ThemedText } from "@/components/themed-text"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { Suspense, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAccountQuery } from "@/features/auth"
import { setAccessToken } from "@/lib/token"
import { API_URL } from "@/constants/api"
import {
  PrimaryDarkOutlineButton,
  PrimaryLightButton,
} from "@/components/buttons"
import { Colors } from "@/constants/theme"

function ProfileContent() {
  const { data, refetch } = useAccountQuery()
  const queryClient = useQueryClient()

  const user = data.user

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

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

  return (
    <>
      <View style={styles.block}>
        <Image
          source={require("../../../assets/images/emptyprofile.png")}
          style={styles.image}
          accessibleLabel="Profile avatar"
        />

        <View style={styles.textContainer}>
          <View style={styles.imageRow}>
            <Image
              source={require("../../../assets/images/nl.png")}
              style={styles.nationImage}
              accessibleLabel="Netherlands flag"
            />

            <Image
              source={require("../../../assets/images/hrlogo.png")}
              style={styles.hrImage}
              accessibleLabel="Hogeschool Rotterdam logo"
            />
          </View>

          <ThemedText type="text" style={{ fontWeight: "bold" }}>
            {user.name || "No name"}
          </ThemedText>

          <ThemedText type="text">
            {user.campus || "No campus selected"}
          </ThemedText>

          <ThemedText type="text">
            {user.school || "No school selected"}
          </ThemedText>

          <PrimaryLightButton
            title="settings"
            onPress={() => router.push("/settings")}
          />
        </View>
      </View>

      <View style={styles.container}>
        <PrimaryDarkOutlineButton
          title={logout.isPending ? "Logging out…" : "Log Out"}
          disabled={logout.isPending}
          onPress={() => logout.mutate()}
        />
      </View>
    </>
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
  block: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.orangeColor,
    paddingLeft: 20,
  },

  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 12,
  },

  nationImage: {
    width: 40,
    height: 40,
    borderRadius: 40,
    marginRight: 12,
  },

  hrImage: {
    width: 150,
    height: 40,
    marginBottom: 4,
  },

  textContainer: {
    flex: 1,
    marginLeft: 50,
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: Colors.background,
    justifyContent: "space-between",
  },

  loader: {
    flex: 1,
  },
})
