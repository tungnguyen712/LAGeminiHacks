import Constants from 'expo-constants';

const BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:8000';

const WS_URL = BASE_URL.replace(/^http/, 'ws');

export function buildLiveWebSocketUrl(languageCode: string): string {
  return `${WS_URL}/api/live?languageCode=${encodeURIComponent(languageCode)}`;
}

/** Opens a WebSocket; caller should send `{ type: 'context', routeContext }` on `onopen`. */
export function openLiveSession(_routeContext: string, languageCode: string): WebSocket {
  return new WebSocket(buildLiveWebSocketUrl(languageCode));
}
