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
  const { data } = useInterestQuery()

  const interests = data?.interests || []
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
          {interests.map((interest) => (
            <Text style={styles.interest} key={interest.id}>
              {interest.name}
            </Text>
          ))}
        </View>

        <View>
          <Text style={styles.language}>Languages</Text>
        </View>

        {/*<View style={styles.container}>*/}
        {/*  <Modal visible={isVisible} transparent animationType="slide">*/}
        {/*    <View style={styles.modalBackground}>*/}
        {/*      <View style={styles.modalContent}>*/}
        {/*        <FlatList*/}
        {/*          data={dummyLanguages}*/}
        {/*          keyExtractor={(item) => item}*/}
        {/*          renderItem={({ item }) => (*/}
        {/*            <TouchableOpacity*/}
        {/*              style={styles.option}*/}
        {/*              onPress={() => handleLanguageSelect(item)}*/}
        {/*            >*/}
        {/*              <ThemedText style={styles.optionText}>{item}</ThemedText>*/}
        {/*            </TouchableOpacity>*/}
        {/*          )}*/}
        {/*        />*/}

        {/*        <TouchableOpacity onPress={() => setIsVisible(false)}>*/}
        {/*          <ThemedText style={styles.closeText}>Close</ThemedText>*/}
        {/*        </TouchableOpacity>*/}
        {/*      </View>*/}
        {/*    </View>*/}
        {/*  </Modal>*/}
        {/*</View>*/}

        <View style={styles.button}>
          <PrimaryLightButton
            title="Next"
            onPress={() => router.push("/matching")}
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

  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
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

  language: {
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

  dropdownButton: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#D1D1D1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownButtonText: {
    color: "#6B6B6B",
    textAlign: "center",
    fontSize: 18,
  },

  arrow: {
    fontSize: 20,
    color: "#6B6B6B",
  },

  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    width: "80%",
    maxHeight: "60%",
  },

  option: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  optionText: {
    fontSize: 18,
    color: "#333",
  },

  closeText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
    color: "#548C2F",
    fontWeight: "bold",
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
})
