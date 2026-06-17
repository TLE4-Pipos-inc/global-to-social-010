import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native"
import { PrimaryLightOutlineButton } from "@/components/buttons"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Colors } from "@/constants/theme"
import { useUserGroupPhotosQuery } from "@/features/group-photos"
import { GroupPhotoCard } from "@/features/group-photos/components/group-photo-card"

function getGroups(data) {
  return data?.result?.groups ?? []
}

function getSessionTitle(session) {
  if (session?.route?.name) return session.route.name
  if (session?.selectedTimeSlot) return session.selectedTimeSlot

  return "Group session"
}

export function GroupPhotosSection() {
  const { data, error, isError, isLoading, refetch, isRefetching } =
    useUserGroupPhotosQuery()

  if (isLoading) {
    return (
      <ThemedView style={styles.section}>
        <ThemedText style={styles.title}>Group memories</ThemedText>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.darkGreenColor} />
          <ThemedText style={styles.mutedText}>Loading memories...</ThemedText>
        </View>
      </ThemedView>
    )
  }

  if (isError) {
    return (
      <ThemedView style={styles.section}>
        <ThemedText style={styles.title}>Group memories</ThemedText>
        <ThemedText selectable style={styles.errorText}>
          {error?.message || "Could not load group memories."}
        </ThemedText>
        <PrimaryLightOutlineButton
          title={isRefetching ? "Trying again..." : "Try again"}
          disabled={isRefetching}
          onPress={() => refetch()}
        />
      </ThemedView>
    )
  }

  const groups = getGroups(data)

  if (groups.length === 0) {
    return (
      <ThemedView style={styles.section}>
        <ThemedText style={styles.title}>Group memories</ThemedText>
        <ThemedText style={styles.mutedText}>
          No group memories yet.
        </ThemedText>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.section}>
      <ThemedText style={styles.title}>Group memories</ThemedText>

      {groups.map((groupMemory) => (
        <View key={groupMemory.group.id} style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.groupTitleBlock}>
              <ThemedText style={styles.groupTitle}>
                {groupMemory.group.groupName}
              </ThemedText>
              <ThemedText style={styles.groupMeta}>
                {groupMemory.sessionCount} sessions - {groupMemory.photoCount}{" "}
                photos
              </ThemedText>
            </View>
            <ThemedText style={styles.memberBadge}>
              {groupMemory.member.role}
            </ThemedText>
          </View>

          {groupMemory.sessions.map((session) => {
            if (!session.photos?.length) return null

            return (
              <View key={session.id} style={styles.sessionBlock}>
                <ThemedText style={styles.sessionTitle}>
                  {getSessionTitle(session)}
                </ThemedText>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoRow}
                >
                  {session.photos.map((photo) => (
                    <GroupPhotoCard key={photo.id} photo={photo} />
                  ))}
                </ScrollView>
              </View>
            )
          })}
        </View>
      ))}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 22,
    marginTop: 22,
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    shadowColor: Colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  mutedText: {
    color: Colors.icon,
    fontSize: 14,
  },

  errorText: {
    color: Colors.dangerColor,
    fontSize: 14,
  },

  groupCard: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
  },

  groupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  groupTitleBlock: {
    flex: 1,
    gap: 3,
  },

  groupTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.darkGreenColor,
  },

  groupMeta: {
    color: Colors.icon,
    fontSize: 13,
  },

  memberBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: Colors.offWhite,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: Colors.darkGreenColor,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  sessionBlock: {
    gap: 8,
  },

  sessionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },

  photoRow: {
    gap: 10,
    paddingRight: 4,
  },
})
