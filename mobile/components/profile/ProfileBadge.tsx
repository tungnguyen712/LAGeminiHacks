import { View, Text } from 'react-native';
import type { ProfileType } from '../../types/Profile';

interface Props {
  profileType: ProfileType;
}

// TODO: implement profile badge
export function ProfileBadge({ profileType }: Props) {
  return <View><Text>{profileType}</Text></View>;
}
