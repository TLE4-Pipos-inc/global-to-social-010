import { Image } from "expo-image"
import { Platform, StyleSheet, Text, TextBase, View } from "react-native"

import { HelloWave } from "../../components/hello-wave"
import ParallaxScrollView from "../../components/parallax-scroll-view"
import { ThemedText } from "../../components/themed-text"
import { ThemedView } from "../../components/themed-view"
import { Link, router } from "expo-router"
import {
  PrimaryDarkButton,
  PrimaryDarkOutlineButton,
  PrimaryLightButton,
  PrimaryLightOutlineButton,
} from "../../components/buttons"
import { navigate } from "expo-router/build/global-state/routing"

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
          <Text style={styles.title}>GlobalToSocial 010</Text>
          <Text style={styles.text}>
            Join themed group routes around Rotterdam and connect with fellow
            international students at Hogeschool Rotterdam.
          </Text>
          <View style={{top: 10}}>

              <PrimaryLightButton title="start now"  onPress={() => router.push("/map")} />

          </View>
        </View>
      </View>

      <View style={{padding: 30}}>
        <Text style={styles.title}>How does it work</Text>
        <View style={{ gap: 10 }}>
          <View style={styles.box}>
            <Text style={{ padding: 30, color: "#F1F1FFF" }} >Pick a theme</Text>
          </View>
          <View style={styles.box}>
            <Text style={{ padding: 20, color: "#F1F1FFF" }}>
              Select group size and a time slot. We'll match you with students
              who share your interests.
            </Text>
          </View>
          <View style={styles.box}>
            <Text style={{ padding: 30, color: "#F1F1FFF" }}>
              Visit different stops around Rotterdam together.
            </Text>
          </View>
          <View style={styles.box}>
            <Text style={{ padding: 30, color: "#F1F1FFF" }}>
              Connect with other students along the way.
            </Text>
          </View>
        </View>
      </View>
    </ParallaxScrollView>
  )
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  box: {
    top: 10,
    gap: 8,
    height: 80,
    backgroundColor: "#80bd56",
    borderRadius: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
  },
  flex: {
    flex: 1,
  },
  text: {
    fontSize: 17,
  },
})
