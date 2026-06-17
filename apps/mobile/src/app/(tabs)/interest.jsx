import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native"

import { ThemedText } from "@/components/themed-text"
import { router } from "expo-router"
import { PrimaryLightButton } from "@/components/buttons"
import { Suspense, useState, useEffect } from "react"
import { useInterestQuery } from "@/features/intrests"
import { useUserInterestQuery } from "@/features/userInterest"
import { fetchWithAuth } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"

function Interest() {
  const [selectedInterest, setSelectedInterest] = useState([])
  const [errorMessage, setErrorMessage] = useState("")
  const queryClient = useQueryClient()
  const { data } = useInterestQuery()
  const { data: userInterestData } = useUserInterestQuery()

  const interests =
    data?.interests || data?.result?.interests || data?.result || []

  useEffect(() => {
    try {
      const serverItems =
        userInterestData?.result || userInterestData?.interests || []

      if (
        serverItems &&
        serverItems.length > 0 &&
        selectedInterest.length === 0
      ) {
        const ids = serverItems.map(
          (it) => it.interestId ?? it.interest_id ?? it.id
        )
        setSelectedInterest(ids)
      }
    } catch (e) {}
  }, [userInterestData])

  async function saveUserInterests() {
    try {
      setErrorMessage("")

      if (selectedInterest.length < 3) {
        setErrorMessage("Please select at least 3 interests")
        return false
      }

      const response = await fetchWithAuth(`/api/user-interests`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interestIds: selectedInterest,
        }),
      })

      const json = await response.json()

      if (!response.ok) {
        if (json.errors?.interestIds) {
          setErrorMessage("You can only select a maximum of 5 interests")
        } else {
          setErrorMessage(json.message || "Something went wrong")
        }

        return false
      }
      await queryClient.invalidateQueries({ queryKey: ["userInterest"] })
      return true
    } catch (error) {
      setErrorMessage("Could not save interests")
      return false
    }
  }

  return (
    <ScrollView>
      <View>
        <View
          style={{
            borderStyle: "solid",
            borderBottomWidth: 2,
            borderColor: "gray",
            paddingTop: 20,
            paddingBottom: 10,
          }}
        >
          <Text style={styles.title}>match by interest</Text>

          <ThemedText style={styles.text}>
            Pick what you're into — we'll find compatible students
          </ThemedText>
        </View>

        <View>
          <View style={styles.box}>
            <ThemedText style={styles.boxTitle}>How matching works</ThemedText>

            <ThemedText style={styles.boxText}>
              We compare your interests with other groups at the same time slot
              to find the best match.
            </ThemedText>
          </View>
        </View>

        <View style={styles.interestsContainer}>
          {interests.map((interest) => {
            const isSelected = selectedInterest.includes(interest.id)

            return (
              <Pressable
                key={interest.id}
                style={[
                  styles.interest,
                  isSelected && styles.interestPillSelected,
                ]}
                onPress={() => {
                  setErrorMessage("")

                  if (isSelected) {
                    setSelectedInterest(
                      selectedInterest.filter((id) => id !== interest.id)
                    )
                  } else {
                    setSelectedInterest([...selectedInterest, interest.id])
                  }
                }}
              >
                <ThemedText
                  style={[
                    styles.interestText,
                    isSelected && styles.interestTextSelected,
                  ]}
                >
                  {interest.name}
                </ThemedText>
              </Pressable>
            )
          })}
        </View>

        {errorMessage ? (
          <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
        ) : null}

        <View style={styles.button}>
          <PrimaryLightButton
            title="Save"
            onPress={async () => {
              const success = await saveUserInterests()
              if (success) {
                router.push("/settings")
              }
            }}
          />
        </View>
      </View>
    </ScrollView>
  )
}

export default function InterestScreen() {
  return (
    <Suspense fallback={<ActivityIndicator style={styles.loader} />}>
      <Interest />
    </Suspense>
  )
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  box: {
    gap: 8,
    minHeight: 80,
    backgroundColor: "rgba(245,239,239,0.87)",
    borderRadius: 10,
    padding: 16,
  },

  boxTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  boxText: {
    fontSize: 14,
    color: "#555",
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
    alignSelf: "center",
  },

  languageTitle: {
    top: 30,
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
    alignSelf: "center",
  },

  subtitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
    paddingLeft: 30,
  },

  flex: {
    flex: 1,
  },

  text: {
    fontSize: 15,
    alignSelf: "center",
  },

  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 15,
    marginTop: 24,
  },

  interest: {
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: "#D1D1D1",
    backgroundColor: "#FFFFFF",
  },

  interestPillSelected: {
    backgroundColor: "#008100",
    borderColor: "#008100",
  },

  interestText: {
    fontSize: 18,
    color: "#6B6B6B",
    letterSpacing: 1,
  },

  interestTextSelected: {
    color: "#FFFFFF",
  },

  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
  },

  button: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  loader: {
    marginTop: 40,
  },
})
