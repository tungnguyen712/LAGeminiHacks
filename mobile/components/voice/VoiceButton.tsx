import { TouchableOpacity, Text } from 'react-native';

interface Props {
  routeContext: string;
  segmentContext?: string;
}

// TODO: implement voice session toggle button
export function VoiceButton({ routeContext, segmentContext }: Props) {
  return <TouchableOpacity><Text>Voice</Text></TouchableOpacity>;
}
