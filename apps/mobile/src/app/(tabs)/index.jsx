import { Image } from "expo-image"
import { StyleSheet, View } from "react-native"

import ParallaxScrollView from "../../components/parallax-scroll-view"
import { ThemedText } from "../../components/themed-text"
import { router } from "expo-router"
import { PrimaryLightButton } from "../../components/buttons"

export default function HomeScreen() {
  return (
    <ParallaxScrollView>
      <View
        style={{
          padding: 50,
          backgroundColor: "#F9A620",
        }}
      >
        <View style={{ gap: 20 }}>
          <ThemedText type="title">GlobalToSocial 010</ThemedText>
          <ThemedText>
            Join themed group routes around Rotterdam and connect with fellow
            international students at Hogeschool Rotterdam.
          </ThemedText>
          <View style={{ top: 10 }}>
            <PrimaryLightButton
              title="start now"
              onPress={() => router.push("/map")}
            />
          </View>
        </View>
      </View>

      <View style={{ padding: 30 }}>
        <ThemedText type="title">How does it work</ThemedText>
        <View style={styles.grid}>
          <View style={styles.box}>
            <ThemedText style={styles.boxText}>Pick a theme</ThemedText>
          </View>
          <View style={styles.box}>
            <ThemedText style={styles.boxText}>
              Select group size and a time slot. We'll match you with students
              who share your interests.
            </ThemedText>
          </View>
          <View style={styles.box}>
            <ThemedText style={styles.boxText}>
              Visit different stops around Rotterdam together.
            </ThemedText>
          </View>
          <View style={styles.box}>
            <ThemedText style={styles.boxText}>
              Connect with other students along the way.
            </ThemedText>
          </View>
        </View>
      </View>
    </ParallaxScrollView>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "column",
    gap: 10,
    marginTop: 10,
  },
  box: {
    flex: 1,
    backgroundColor: "#80bd56",
    borderRadius: 10,
    padding: 16,
    justifyContent: "center",
  },
  boxText: {
    color: "#F1F1FF",
  },
})
