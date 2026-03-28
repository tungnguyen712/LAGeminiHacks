import { View, Text } from 'react-native';

interface Props {
  confidence: number; // 0.0–1.0
}

// TODO: implement progress bar confidence meter
export function ConfidenceMeter({ confidence }: Props) {
  return <View><Text>{Math.round(confidence * 100)}%</Text></View>;
}
