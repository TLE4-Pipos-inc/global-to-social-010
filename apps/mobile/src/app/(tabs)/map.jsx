import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import MapView, {Marker} from "react-native-maps";
import { ThemedView } from "@/components/themed-view";
import {useEffect, useState} from "react";
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    let subscription;
    async function getCurrentLocation() {
      let {status} = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
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
        {location && (
          <Marker
            coordinate={{
              latitude: 51.9200601,
              longitude: 4.4868003,
            }}
            title="Markthal"
          />
        )}
      </MapView>
      <StatusBar style="auto" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
