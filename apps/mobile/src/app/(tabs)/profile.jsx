import { Image } from "expo-image"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { Suspense } from "react"
import { useAccountQuery, useLogoutMutation } from "@/features/auth"
import {
  GroupPhotosSection,
  useUserGroupPhotosQuery,
} from "@/features/group-photos"
import {
  PrimaryDarkOutlineButton,
  PrimaryLightButton,
} from "@/components/buttons"
import { Colors } from "@/constants/theme"

function hasAnyPhotos(data) {
  const groups = data?.result?.groups ?? []
  return groups.some((group) =>
    group.sessions?.some((session) => session.photos?.length),
  )
}

function ProfileContent() {
  const accountQuery = useAccountQuery()
  const logout = useLogoutMutation()
  const groupPhotosQuery = useUserGroupPhotosQuery()
  const user = accountQuery.data.result
  const hasPhotos = hasAnyPhotos(groupPhotosQuery.data)

  const logoutButton = (
    <PrimaryDarkOutlineButton
      title={logout.isPending ? "Logging out…" : "Log Out"}
      disabled={logout.isPending}
      onPress={() =>
        logout.mutate(undefined, {
          onSettled: () => router.replace("/(auth)/login"),
        })
      }
    />
  )

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.block}>
          {/*<Image*/}
          {/*  source={require("../../../assets/images/emptyprofile.png")}*/}
          {/*  style={styles.image}*/}
          {/*  accessibleLabel="Profile avatar"*/}
          {/*/>*/}

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
          </View>
        </View>
        <ThemedView style={styles.container}>
          <PrimaryLightButton
            title="settings"
            onPress={() => router.push("/(tabs)/settings")}
          />

          {hasPhotos && logoutButton}
        </ThemedView>

        <GroupPhotosSection />

        {!hasPhotos && (
          <ThemedView style={styles.logoutBelow}>{logoutButton}</ThemedView>
        )}

        <ThemedText type="text" style={styles.delete}>
          Want to delete all data related to you? email:
          <ThemedText style={styles.deleteEmail}>
            {" "}
            support@globaltosocial010.nl{" "}
          </ThemedText>
          with your GDPR request.
        </ThemedText>
      </ScrollView>
    </ThemedView>
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
  delete: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: 500,
    textAlign: "center",
  },

  deleteEmail: {
    fontSize: 12,
    fontWeight: 500,
    textDecorationLine: "underline",
  },

  screen: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },

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
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 32,
    backgroundColor: Colors.background,
  },

  logoutBelow: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },

  loader: {
    flex: 1,
  },
})
