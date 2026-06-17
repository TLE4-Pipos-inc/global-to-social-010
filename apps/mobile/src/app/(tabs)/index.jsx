import { ScrollView, StyleSheet, View } from "react-native"
import { ThemedText } from "@/components/themed-text"
import { router } from "expo-router"
import { PrimaryLightButton } from "@/components/buttons"
import { Colors } from "@/constants/theme"

export default function HomeScreen() {
  return (
    <ScrollView style={styles.scroll}>
      <View style={{ padding: 50, backgroundColor: Colors.orangeColor }}>
        <View style={{ gap: 20 }}>
          <ThemedText type="title">GlobalToSocial 010</ThemedText>
          <ThemedText>
            Join themed group routes around Rotterdam and connect with fellow
            international students at Hogeschool Rotterdam.
          </ThemedText>
          <View style={{ top: 10 }}>
            <PrimaryLightButton
              title="start now"
              onPress={() => router.push("/theme")}
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
              Select group size and a time slot. We&apos;ll match you with
              students who share your interests.
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: "column",
    gap: 10,
    marginTop: 10,
  },
  box: {
    flex: 1,
    backgroundColor: Colors.lightGreenColor,
    borderRadius: 10,
    padding: 16,
    justifyContent: "center",
  },
  boxText: {
    color: Colors.offWhite,
  },
})
