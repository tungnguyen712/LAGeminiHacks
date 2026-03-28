import { View, Text } from 'react-native';
import type { FrictionLevel } from '../../types/Route';

interface Props {
  level: FrictionLevel;
}

// TODO: implement colored friction badge
export function FrictionBadge({ level }: Props) {
  return <View><Text>{level}</Text></View>;
}
