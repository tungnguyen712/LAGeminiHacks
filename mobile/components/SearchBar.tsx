import { View, TextInput, TouchableOpacity, Text } from 'react-native';

interface Props {
  onSearch: (origin: string, destination: string) => void;
}

// TODO: implement search bar component
export function SearchBar({ onSearch }: Props) {
  return <View />;
}
