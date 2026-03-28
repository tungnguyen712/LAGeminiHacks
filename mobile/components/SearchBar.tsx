import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon?: 'Circle' | 'MapPin' | 'Search';
  onVoicePress?: () => void;
}

const iconMap: Record<string, IoniconName> = {
  Circle: 'radio-button-on-outline',
  MapPin: 'location-outline',
  Search: 'search-outline',
};

export const SearchBar = ({
  value,
  onChangeText,
  placeholder,
  icon = 'Search',
  onVoicePress,
}: SearchBarProps) => {
  const ionIconName: IoniconName = iconMap[icon] ?? 'search-outline';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={ionIconName} size={20} color="#94a3b8" />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#475569"
      />
      {onVoicePress && (
        <TouchableOpacity onPress={onVoicePress} style={styles.voiceButton}>
          <Ionicons name="mic-outline" size={20} color="#3b82f6" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    padding: 0,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
