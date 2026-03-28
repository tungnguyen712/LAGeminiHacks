import { TouchableOpacity, Text } from 'react-native';
import type { Route } from '../../types/Route';

interface Props {
  route: Route;
  onSelect: (id: string) => void;
}

// TODO: implement route card with friction badge
export function RouteCard({ route, onSelect }: Props) {
  return <TouchableOpacity onPress={() => onSelect(route.id)}><Text>{route.label}</Text></TouchableOpacity>;
}
