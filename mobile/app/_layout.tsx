import { Slot } from 'expo-router';
import { LocaleProvider } from '../store/LocaleContext';
import { ProfileProvider } from '../store/ProfileContext';
import { RouteProvider } from '../store/RouteContext';

export default function RootLayout() {
  return (
    <LocaleProvider>
      <ProfileProvider>
        <RouteProvider>
          <Slot />
        </RouteProvider>
      </ProfileProvider>
    </LocaleProvider>
  );
}
