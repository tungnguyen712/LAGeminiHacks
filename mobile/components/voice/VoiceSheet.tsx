import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  transcript: string[];
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onAudio?: (base64: string) => void;
}

export function VoiceSheet({
  transcript,
  connected,
  onConnect,
  onDisconnect,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Gemini Live</Text>
        <TouchableOpacity
          style={[styles.toggle, connected && styles.toggleOn]}
          onPress={connected ? onDisconnect : onConnect}
        >
          <Text style={styles.toggleText}>{connected ? 'Disconnect' : 'Connect'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        {connected
          ? 'Speak naturally — e.g. “Which route is safest for me?”'
          : 'Connect to stream your questions to Gemini Live (audio in / out).'}
      </Text>
      <ScrollView style={styles.log}>
        {transcript.map((line, i) => (
          <Text key={i} style={styles.line}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { color: '#F2F2F7', fontSize: 16, fontWeight: '700' },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#3A3A3C',
  },
  toggleOn: { backgroundColor: '#1B4D3E' },
  toggleText: { color: '#E5E5EA', fontSize: 13, fontWeight: '600' },
  hint: { color: '#8E8E93', fontSize: 12, marginBottom: 8 },
  log: { maxHeight: 160 },
  line: { color: '#E5E5EA', fontSize: 14, marginBottom: 6 },
});
