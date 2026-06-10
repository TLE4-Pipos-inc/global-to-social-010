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
import { Suspense, useState } from "react"
import { useInterestQuery } from "@/features/intrests/hooks/query"
import { API_URL } from "@/constants/api"
import { useAccountQuery } from "@/features/auth"
import { fetchWithAuth } from "@/lib/api"

function Interest() {
  const [selectedInterest, setSelectedInterest] = useState([])

  const { data: userdata } = useAccountQuery()
  const user = userdata?.user

  const { data } = useInterestQuery()

  const interests = data?.interests || []

  async function saveUserInterests() {
    try {
      const response = await fetchWithAuth(`/api/user-interests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interestIds: selectedInterest,
        }),
      })

      const json = await response.json()

      // console.log("Saved interests:", json)
    } catch (error) {
      // console.error("Failed to save interests", error)
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

        <View style={{}}>
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

        <View>
          <Text style={styles.languageTitle}>Languages</Text>
        </View>

        <View style={styles.button}>
          <PrimaryLightButton
            title="Next"
            onPress={async () => {
              await saveUserInterests()
              router.push("/profile")
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
    backgroundColor: "#548C2F",
    borderColor: "#548C2F",
  },

  interestText: {
    fontSize: 18,
    color: "#6B6B6B",
    letterSpacing: 1,
  },

  interestTextSelected: {
    color: "#FFFFFF",
  },

  button: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
})
