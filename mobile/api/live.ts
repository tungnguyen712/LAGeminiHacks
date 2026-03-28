import Constants from 'expo-constants';

const BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:8000';

const WS_URL = BASE_URL.replace(/^http/, 'ws');

export function openLiveSession(routeContext: string, languageCode: string): WebSocket {
  const ws = new WebSocket(
    `${WS_URL}/api/live?languageCode=${languageCode}`
  );
  // Send route context once connection opens
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'context', routeContext }));
  };
  return ws;
}
