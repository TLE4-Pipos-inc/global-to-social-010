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
} from "react-native"

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
import { useState } from "react"

const dummyInterests = [
  { id: 1, name: "Gaming" },
  { id: 2, name: "Music" },
  { id: 3, name: "Sports" },
  { id: 4, name: "Languages" },
  { id: 5, name: "Food" },
  { id: 6, name: "Travel" },
  { id: 7, name: "culture" },
  { id: 8, name: "Nightlife" },
  { id: 9, name: "Quiet chats" },
]

const dummyLanguages = [
  "English",
  "Dutch",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Japanese",
  "Korean",
]

export default function Interest() {
  const [selectedInterests, setSelectedInterests] = useState([])
  const [isVisible, setIsVisible] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(null)

  // async function createPost() {
  //   try {
  //     const response = await fetch('https://prg06-node-express.antwan.eu/spots/', {
  //       method: 'POST',
  //       headers: {
  //         Accept: 'application/json',
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         title: formData.name,
  //         description: formData.description,
  //         review: review,
  //       }),
  //     });
  //
  //     if (!response.ok) {
  //       const text = await response.text();
  //       console.error('Create failed', response.status, text);
  //       Alert.alert('Fout', 'Opslaan mislukt');
  //       return;
  //     }
  //
  //     const data = await response.json();
  //     console.log('Created', data);
  //     navigation.popToTop('Home');
  //
  //   } catch (error) {
  //     console.error('Er is een fout opgetreden:', error);
  //     Alert.alert('Fout', 'Netwerkfout tijdens opslaan');
  //   }
  // }

  const toggleInterest = (interest) => {
    setSelectedInterests((current) => {
      const alreadySelected = current.some((item) => item.id === interest.id)

      if (alreadySelected) {
        return current.filter((item) => item.id !== interest.id)
      }

      return [...current, interest]
    })
  }

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language)
    setIsVisible(false)
  }

  return (
    <ParallaxScrollView>
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
          <Text style={styles.text}>
            Pick what you're into — we'll find compatible students
          </Text>
        </View>

        <View>
          <View style={styles.interestsContainer}>
            {dummyInterests.map((interest) => {
              const isSelected = selectedInterests.some(
                (item) => item.id === interest.id
              )

              return (
                <Pressable
                  key={interest.id}
                  onPress={() => toggleInterest(interest)}
                  style={[
                    styles.interestPill,
                    isSelected && styles.interestPillSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.interestText,
                      isSelected && styles.interestTextSelected,
                    ]}
                  >
                    {interest.name}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={{ padding: 20 }}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>How matching works</Text>
            <Text style={styles.boxText}>
              We compare your interests with other groups at the same time slot
              to find the best match.
            </Text>
          </View>
        </View>

        <View>
          <Text style={styles.subtitle}>Languages</Text>
        </View>

        <View style={styles.container}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setIsVisible(true)}
          >
            <Text style={styles.dropdownButtonText}>
              {selectedLanguage || "Select a language"}
            </Text>
            <Text style={styles.arrow}>⌄</Text>
          </TouchableOpacity>

          <Modal visible={isVisible} transparent animationType="slide">
            <View style={styles.modalBackground}>
              <View style={styles.modalContent}>
                <FlatList
                  data={dummyLanguages}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.option}
                      onPress={() => handleLanguageSelect(item)}
                    >
                      <Text style={styles.optionText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />

                <TouchableOpacity onPress={() => setIsVisible(false)}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>

        <View style={styles.button}>
          <PrimaryLightButton
            title="Next"
            onPress={() => router.push("/map")}
          />
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
    alignItems: "center",
    gap: 15,
    marginTop: 24,
  },

  interestPill: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
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

  container: {
    margin: 20,
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
