import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from "react-native"
import MapView, {Marker, Callout} from "react-native-maps";
import { ThemedView } from "@/components/themed-view";
import {useEffect, useState} from "react";
import * as Location from 'expo-location';
import { API_URL } from "@/constants/api";

export default function App() {
  const [location, setLocation] = useState(null);
  const [venues, setVenues] = useState([])

  useEffect(() => {
    fetch(`${API_URL}/api/venues`)
      .then(res => res.json())
      .then(setVenues)
  }, [])

  useEffect(() => {
    let subscription;
    async function getCurrentLocation() {
      let {status} = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Low,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (newLocation) => {
          setLocation(newLocation);
        }
      );
    }
    getCurrentLocation();
    return () => subscription?.remove();
  }, []);
  return (
    <ThemedView style={styles.container}>
      <MapView region={{ latitude: 51.9244, longitude: 4.4777, latitudeDelta: 0.1, longitudeDelta: 0.1, }} style={styles.map} showsUserLocation={true} >
        {venues.map((venue) => (
          <Marker
            key={venue.id}
            coordinate={{
              latitude: Number(venue.latitude),
              longitude: Number(venue.longitude),
            }}
          >
            <Callout style={{ height: 100, width: 400 }}>
              <View style={styles.popup}>
                <ScrollView>
                  <Text style={{ fontWeight: "bold" }}>{venue.name}</Text>
                  <Text accessibilityLabel={venue.description} >{venue.description}</Text>
                </ScrollView>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <StatusBar style="auto" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  popup: {
    padding: 15,
    maxWidth: "80%",
  }
});
