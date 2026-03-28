import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import * as Icons from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon?: string;
  onVoicePress?: () => void;
}

export const SearchBar = ({ value, onChangeText, placeholder, icon = 'Search', onVoicePress }: SearchBarProps) => {
  const IconComponent = (Icons as any)[icon] || Icons.Search;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconComponent size={20} color="#94a3b8" />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        autoCorrect={false}
        spellCheck={false}
      />
      {onVoicePress && (
        <TouchableOpacity onPress={onVoicePress} style={styles.voiceButton}>
          <Icons.Mic size={20} color="#3b82f6" />
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
