import React from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VoiceButtonProps {
  isListening: boolean;
  onPress: () => void;
  size?: number;
}

export const VoiceButton = ({ isListening, onPress, size = 64 }: VoiceButtonProps) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isListening) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      scale.setValue(1);
    }
  }, [isListening, scale]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        isListening && styles.listening,
      ]}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name="mic"
          size={size * 0.4}
          color={isListening ? '#ffffff' : '#3b82f6'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  listening: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
});
