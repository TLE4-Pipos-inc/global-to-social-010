import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { useMatchmaking } from '@/features/matchmaking/socket-context';

export function HapticTab(props) {
  const { match, sessionStarted } = useMatchmaking();

  function handlePressIn(ev) {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    props.onPressIn?.(ev);
  }

  function handlePress(ev) {
    if (match || sessionStarted) {
      Alert.alert(
        "Can't leave session",
        "You are currently in a session and cannot switch screens until the session finishes or you leave the session.",
        [{ text: 'OK' }],
      );
      return;
    }
    props.onPress?.(ev);
  }
  return <PlatformPressable {...props} onPressIn={handlePressIn} onPress={handlePress} />;
}
