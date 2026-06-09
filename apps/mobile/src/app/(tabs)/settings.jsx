import { Image } from "expo-image"
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { router } from "expo-router"
import { Suspense, useState } from "react"
import { useAccountQuery } from "@/features/auth"
import {
  PrimaryLightButton,
  PrimaryLightOutlineButton,
} from "@/components/buttons"
import { fetchWithAuth } from "@/lib/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { setAccessToken } from "@/lib/token"
import { API_URL } from "@/constants/api"
import { ThemedView } from "@/components/themed-view"
import { ThemedText } from "@/components/themed-text"

const schools = ["Hogeschool Rotterdam", "EuroCollege Hogeschool"]

const campuses = [
  "International Business",
  "International Business & Entrepreneurship",
]

function Settings() {
  const { data } = useAccountQuery()
  const queryClient = useQueryClient()

  const [name, setName] = useState(data.user.name || "")
  const [selectedSchool, setSelectedSchool] = useState(data.user.school || "")
  const [selectedCampus, setSelectedCampus] = useState(data.user.campus || "")

  const [schoolModalVisible, setSchoolModalVisible] = useState(false)
  const [campusModalVisible, setCampusModalVisible] = useState(false)

  const [isSaving, setIsSaving] = useState(false)

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

  const deleteAccount = () => {
    console.log("Delete account pressed")
  }

  const saveUserInfo = async () => {
    try {
      if (!name) {
        return
      }

      if (!selectedSchool) {
        return
      }

      if (!selectedCampus) {
        return
      }

      setIsSaving(true)

      console.log("Sending update:", {
        name,
        school: selectedSchool,
        campus: selectedCampus,
      })

      const res = await fetchWithAuth("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          school: selectedSchool,
          campus: selectedCampus,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        new Error("Could not save profile")
      }

      const result = await res.json()

      router.replace("/profile")
    } catch (error) {
    } finally {
      setIsSaving(false)
    }
  }

  const handleSchoolSelect = (school) => {
    setSelectedSchool(school)
    setSchoolModalVisible(false)
  }

  const handleCampusSelect = (campus) => {
    setSelectedCampus(campus)
    setCampusModalVisible(false)
  }

  return (
    <ScrollView>
      <ThemedView style={styles.screen}>
        <ThemedView style={styles.orangeSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={require("../../../assets/images/emptyprofile.png")}
              style={styles.image}
              accessibleLabel="Profile avatar"
            />
          </View>

          <ThemedView style={styles.card}>
            <ThemedText style={styles.label}>Name</ThemedText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#777"
            />

            <ThemedText style={styles.label}>School</ThemedText>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setSchoolModalVisible(true)}
            >
              <ThemedText style={styles.dropdownButtonText} numberOfLines={1}>
                {selectedSchool || "Select school"}
              </ThemedText>
              <ThemedText style={styles.arrow}>⌄</ThemedText>
            </TouchableOpacity>

            <ThemedText style={styles.label}>Campus</ThemedText>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setCampusModalVisible(true)}
            >
              <ThemedText style={styles.dropdownButtonText} numberOfLines={1}>
                {selectedCampus || "Select campus"}
              </ThemedText>
              <ThemedText style={styles.arrow}>⌄</ThemedText>
            </TouchableOpacity>

            {isSaving && <ActivityIndicator style={styles.savingLoader} />}

            <ThemedView style={styles.buttonWrapper}>
              <PrimaryLightButton
                title={isSaving ? "Saving..." : "Save profile"}
                onPress={saveUserInfo}
                disabled={isSaving}
              />
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.actionsSection}>
          <ThemedText style={styles.actionsTitle}>Account</ThemedText>

          <PrimaryLightOutlineButton
            title={logout.isPending ? "Logging out..." : "Log out"}
            disabled={logout.isPending}
            onPress={() => logout.mutate()}
          />

          <TouchableOpacity style={styles.deleteButton} onPress={deleteAccount}>
            <ThemedText style={styles.deleteButtonText}>
              Delete account
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.bottomFill} />

        <Modal visible={schoolModalVisible} transparent animationType="slide">
          <ThemedView style={styles.modalBackground}>
            <ThemedView style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Select school</ThemedText>

              <FlatList
                data={schools}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => handleSchoolSelect(item)}
                  >
                    <ThemedText style={styles.optionText}>{item}</ThemedText>
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity onPress={() => setSchoolModalVisible(false)}>
                <ThemedText style={styles.closeText}>Close</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </Modal>

        <Modal visible={campusModalVisible} transparent animationType="slide">
          <ThemedView style={styles.modalBackground}>
            <ThemedView style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Select campus</ThemedText>

              <FlatList
                data={campuses}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => handleCampusSelect(item)}
                  >
                    <ThemedText style={styles.optionText}>{item}</ThemedText>
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity onPress={() => setCampusModalVisible(false)}>
                <ThemedText style={styles.closeText}>Close</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </Modal>
      </ThemedView>
    </ScrollView>
  )
}

export default function SettingScreen() {
  return (
    <Suspense fallback={<ActivityIndicator style={styles.loader} />}>
      <Settings />
    </Suspense>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ECECEC",
  },

  topHeader: {
    backgroundColor: "#F2D560",
    paddingTop: 58,
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
  },

  orangeSection: {
    backgroundColor: "#ECAA3C",
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    alignItems: "center",
  },

  avatarWrapper: {
    marginBottom: 14,
  },

  image: {
    width: 160,
    height: 160,
    borderRadius: 100,
    backgroundColor: "#D9D9D9",
  },

  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 5,
    marginTop: 4,
  },

  input: {
    height: 44,
    backgroundColor: "#F7F7F7",
    borderWidth: 1.3,
    borderColor: "#222",
    borderRadius: 13,
    paddingHorizontal: 14,
    color: "#111",
    fontSize: 16,
    marginBottom: 9,
  },

  dropdownButton: {
    height: 44,
    backgroundColor: "#F7F7F7",
    borderWidth: 1.3,
    borderColor: "#222",
    borderRadius: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  dropdownButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#111",
  },

  arrow: {
    fontSize: 22,
    color: "#111",
    marginTop: -4,
  },

  savingLoader: {
    marginVertical: 6,
  },

  buttonWrapper: {
    marginTop: 6,
  },

  bottomFill: {
    flex: 1,
  },

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 24,
  },

  modalContent: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    maxHeight: "70%",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    color: "#111",
  },

  option: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },

  optionText: {
    fontSize: 15,
    color: "#111",
  },

  closeText: {
    textAlign: "center",
    marginTop: 14,
    fontWeight: "700",
    color: "#111",
    fontSize: 15,
  },

  loader: {
    flex: 1,
  },

  actionsSection: {
    marginHorizontal: 22,
    marginTop: 22,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  actionsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },

  deleteButton: {
    marginTop: 12,
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#D64545",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
  },

  deleteButtonText: {
    color: "#D64545",
    fontSize: 16,
    fontWeight: "700",
  },
})
