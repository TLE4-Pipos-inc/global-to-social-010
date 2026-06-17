import { Alert, StyleSheet, View } from "react-native"
import {
  launchCameraAsync,
  requestCameraPermissionsAsync,
} from "expo-image-picker"
import { ThemedText } from "@/components/themed-text"
import { PrimaryLightButton } from "@/components/buttons"
import { Colors } from "@/constants/theme"
import { fetchWithAuth } from "@/lib/api"
import { useMatchmaking } from "@/features/matchmaking/socket-context"
import { useBusyAction } from "@/features/matchmaking/use-busy-action"

/**
 * Shown while a stop is `awaiting_photo`. The server spotlights one connected
 * member (`photoRequest.chosenUserId`) to take the group selfie that ends the
 * stop; everyone else just waits. A null `chosenUserId` means nobody was
 * connected at pick time, so any member may rescue the stop.
 */
export function StopPhotoPrompt({ stop, photoRequest, myId, match }) {
  const { submitStopPhoto } = useMatchmaking()
  const [busy, run] = useBusyAction()

  const chosenUserId = photoRequest?.chosenUserId ?? null
  const isChosen = chosenUserId === null || chosenUserId === myId
  const chosenName =
    match?.members?.find((m) => m.userId === chosenUserId)?.name ?? "someone"

  async function capture() {
    const permission = await requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        "Camera needed",
        "Allow camera access so your group can finish this stop.",
      )
      return
    }

    const result = await launchCameraAsync({
      base64: true,
      quality: 0.5,
      cameraType: "front",
    })
    if (result.canceled) return

    const asset = result.assets?.[0]
    if (!asset?.base64) {
      Alert.alert("Photo failed", "Could not read the photo. Try again.")
      return
    }

    const response = await fetchWithAuth("/api/photos", {
      method: "POST",
      body: JSON.stringify({
        sessionStopId: stop.id,
        uploadedByGroupId: match?.group?.id,
        imageBase64: `data:image/jpeg;base64,${asset.base64}`,
        fileName: "selfie.jpg",
        mimeType: "image/jpeg",
        proofType: "group_selfie",
      }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.message ?? "Upload failed")
    }

    const { result: photo } = await response.json()
    const sessionId = match?.session?.id ?? photoRequest?.sessionId
    await submitStopPhoto(sessionId, stop.id, photo.id)
  }

  return (
    <View style={styles.card}>
      <ThemedText type="subtitle" style={styles.title}>
        Group selfie time!
      </ThemedText>
      {isChosen ? (
        <>
          <ThemedText style={styles.body}>
            You&apos;ve been picked to capture the group selfie that ends this
            stop.
          </ThemedText>
          <PrimaryLightButton
            title={busy ? "Uploading…" : "Take group selfie"}
            disabled={busy}
            onPress={() => run(capture)}
          />
        </>
      ) : (
        <ThemedText style={styles.body}>
          Waiting for <ThemedText type="defaultSemiBold">{chosenName}</ThemedText>{" "}
          to take the group selfie…
        </ThemedText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
  },
  title: {
    color: Colors.darkGreenColor,
  },
  body: {
    fontSize: 14,
    color: "#444",
  },
})
