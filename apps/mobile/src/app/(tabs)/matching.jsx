import { ActivityIndicator, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function Matching() {
  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" style={ styles.loader } />

      <ThemedText style={styles.title}>
        Searching for matches...
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        This may take a few seconds.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    alignItems: "center",
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.7,
  },
  loader: {
    transform: [{ scale: 1.5 }],
    paddingBottom: 20,
  },
});