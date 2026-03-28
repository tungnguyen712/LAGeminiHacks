import { View } from 'react-native';
import type { Route } from '../../types/Route';

interface Props {
  routes: Route[];
  onSegmentPress: (segmentId: string) => void;
}

// TODO: implement map with friction overlays
export function RouteMap({ routes, onSegmentPress }: Props) {
  return <View />;
}
