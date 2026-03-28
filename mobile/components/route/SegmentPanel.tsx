import { View, Text } from 'react-native';
import type { Segment } from '../../types/Route';

interface Props {
  segment: Segment;
}

// TODO: implement segment detail panel
export function SegmentPanel({ segment }: Props) {
  return <View><Text>{segment.description}</Text></View>;
}
