import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  onSearch: (origin: string, destination: string) => void;
  loading?: boolean;
  defaultOrigin?: string;
}

export function SearchBar({ onSearch, loading, defaultOrigin }: Props) {
  const [origin, setOrigin] = useState(defaultOrigin ?? 'UCLA Ackerman Union');
  const [destination, setDestination] = useState('Royce Hall, UCLA');

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Origin</Text>
      <TextInput
        style={styles.input}
        placeholder="Starting place"
        placeholderTextColor="#636366"
        value={origin}
        onChangeText={setOrigin}
      />
      <Text style={styles.label}>Destination</Text>
      <TextInput
        style={styles.input}
        placeholder="Where to"
        placeholderTextColor="#636366"
        value={destination}
        onChangeText={setDestination}
      />
      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={() => onSearch(origin.trim(), destination.trim())}
        disabled={loading}
      >
        <Text style={styles.btnText}>{loading ? 'Finding routes…' : 'Find routes'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: '#AEAEB2', fontSize: 13, marginLeft: 4 },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F2F2F7',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  btn: {
    backgroundColor: '#8AB4F8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#1C1C1E', fontSize: 16, fontWeight: '700' },
});
