import { useCallback } from 'react';
import { Audio } from 'expo-av';
import { speakSummary } from '../api/tts';

export function useTTS() {
  const speak = useCallback(async (text: string, languageTag: string) => {
    try {
      const { audioBase64, mimeType } = await speakSummary({ text, languageTag });
      const { sound } = await Audio.Sound.createAsync({
        uri: `data:${mimeType};base64,${audioBase64}`,
      });
      await sound.playAsync();
    } catch (err) {
      console.error('TTS error:', err);
    }
  }, []);

  return { speak };
}
