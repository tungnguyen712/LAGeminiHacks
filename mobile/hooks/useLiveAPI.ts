import { useCallback, useEffect, useRef, useState } from 'react';
import { openLiveSession } from '../api/live';

export function useLiveAPI(routeContext: string, languageCode: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const ws = openLiveSession(routeContext, languageCode);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'transcript') {
        setTranscript((prev) => [...prev, msg.text]);
      }
    };
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    wsRef.current = ws;
  }, [routeContext, languageCode]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const sendAudio = useCallback((base64Audio: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'audio', data: base64Audio }));
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return { connect, disconnect, sendAudio, transcript, connected };
}
