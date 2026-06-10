import { useEffect } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getSocket } from "@/lib/socket";
import { useSocketInit } from "@/lib/use-socket-init";

export default function Matching({ navigation }) {
  useSocketInit();
  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      console.warn("Socket not initialized");
      return;
    }

    // 🎯 main event: match found
    const onMatchFound = (match) => {
      console.log("Match found:", match);

      // go to next screen (lobby / session ready)
      navigation.replace("MatchLobby", { match });
    };

    // ⚠️ error handler
    const onError = ({ code, message }) => {
      console.warn("Matchmaking error:", code, message);
      // optionally navigate back or show toast
    };

    // 📡 optional: queue updates (progress UI later)
    const onQueueUpdate = (data) => {
      console.log("Queue update:", data);
    };

    socket.on("match:found", onMatchFound);
    socket.on("error:matchmaking", onError);
    socket.on("queue:update", onQueueUpdate);

    return () => {
      socket.off("match:found", onMatchFound);
      socket.off("error:matchmaking", onError);
      socket.off("queue:update", onQueueUpdate);
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
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