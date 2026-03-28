import { TouchableOpacity, Text } from 'react-native';
import type { UserProfile, ProfileType } from '../../types/Profile';

interface Props {
  profile: UserProfile;
  onSelect: (type: ProfileType) => void;
}

// TODO: implement profile card
export function ProfileCard({ profile, onSelect }: Props) {
  return <TouchableOpacity onPress={() => onSelect(profile.type)}><Text>{profile.label}</Text></TouchableOpacity>;
}
