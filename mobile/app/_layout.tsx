import { Stack } from 'expo-router';
import { LocaleProvider } from '../store/LocaleContext';
import { ProfileProvider } from '../store/ProfileContext';
import { RouteProvider } from '../store/RouteContext';

export default function RootLayout() {
  return (
    <LocaleProvider>
      <ProfileProvider>
        <RouteProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#1C1C1E' },
              headerTintColor: '#F2F2F7',
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: '#1C1C1E' },
            }}
          />
        </RouteProvider>
      </ProfileProvider>
    </LocaleProvider>
  );
}
