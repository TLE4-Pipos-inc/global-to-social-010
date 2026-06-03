import { Text, View, StyleSheet } from "react-native"
import { Colors } from "../../constants/theme"
import { Image } from "expo-image"
import { ThemedText } from "../../components/themed-text"

export default function profile(){
  return (
   <>
     <View style={styles.block}>
       <Image
         source={require("../../../assets/images/emptyprofile.png")}
         style={styles.image}
       />

       <View style={styles.textContainer}>
         <View style={styles.imageRow}>
           <Image
             source={require("../../../assets/images/nl.png")}
             style={styles.nationImage}
           />
           <Image
             source={require("../../../assets/images/hrlogo.png")}
             style={styles.hrImage}
           />
         </View>
         <ThemedText type={"text"} style={{fontWeight: "bold"}}>Broertje Depay</ThemedText>
         <ThemedText type={"text"}>International Business</ThemedText>
         <ThemedText type={"text"}>Hogeschool Rotterdam</ThemedText>
       </View>
     </View>
   </>
  )
}

const styles = StyleSheet.create({
  block: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.orangeColor,
    paddingLeft: 20,
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 12,
  },

  nationImage: {
    width: 40,
    height: 40,
    borderRadius: 40,
    marginRight: 12,
  },

  hrImage: {
    width: 150,
    height: 40,
    marginBottom: 4,
  },

  textContainer: {
    flex: 1,
    marginLeft: 50,
  },
});