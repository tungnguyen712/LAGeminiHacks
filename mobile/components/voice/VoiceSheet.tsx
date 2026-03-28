import { View, Text } from 'react-native';

interface Props {
  transcript: string[];
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onAudio: (base64: string) => void;
}

// TODO: implement voice transcript sheet
export function VoiceSheet({ transcript, connected }: Props) {
  return <View><Text>{connected ? 'Listening...' : 'Tap to start'}</Text></View>;
}
