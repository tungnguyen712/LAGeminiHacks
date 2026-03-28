import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTTS } from '../../hooks/useTTS';

interface Props {
  message?: string;
  languageTag: string;
}

export function TTSAlert({ message, languageTag }: Props) {
  const { speak } = useTTS();
  if (!message) return null;
  return (
    <TouchableOpacity style={styles.btn} onPress={() => speak(message, languageTag)}>
      <Text style={styles.text}>Play summary</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: '#3A3A3C',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  text: { color: '#8AB4F8', fontSize: 14, fontWeight: '600' },
});
