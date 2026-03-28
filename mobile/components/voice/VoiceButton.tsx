import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  routeContext: string;
  segmentContext?: string;
  connected: boolean;
  onPress: () => void;
}

export function VoiceButton({
  routeContext: _routeContext,
  segmentContext,
  connected,
  onPress,
}: Props) {
  const label = connected ? 'Stop voice' : segmentContext ? 'Ask about segment' : 'Ask PathSense';
  return (
    <TouchableOpacity
      style={[styles.btn, connected && styles.btnOn]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#3A3A3C',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnOn: { backgroundColor: '#1B4D3E', borderWidth: 1, borderColor: '#81C995' },
  text: { color: '#F2F2F7', fontSize: 16, fontWeight: '700' },
});
