import { Image } from "expo-image"
import {
  Platform,
  StyleSheet,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native"

import { ThemedView } from "@/components/themed-view"
import { ThemedText } from "@/components/themed-text"
import { Link, router } from "expo-router"
import {
  PrimaryDarkButton,
  PrimaryDarkOutlineButton,
  PrimaryLightButton,
  PrimaryLightOutlineButton,
} from "@/components/buttons"
import { Suspense, useState } from "react"
import { useAccountQuery } from "@/features/auth"
import { useQueryClient } from "@tanstack/react-query"
import { useInterestQuery } from "@/features/intrests/hooks/query"

function Interest() {
  const [selectedInterest, setSelectedInterest] = useState([])

  const { data } = useInterestQuery()

  const interests = data?.interests || []

  // const toggleInterest = () = {
  //
  // }

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
            onPress={() => router.push("/map")}
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
