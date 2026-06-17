import { View } from "react-native";

import { Colors } from "@/constants/theme";

export function ThemedView({ style, ...otherProps }) {
  return <View style={[{ backgroundColor: Colors.background }, style]} {...otherProps} />;
}
