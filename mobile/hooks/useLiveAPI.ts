import { useCallback, useEffect, useRef, useState } from 'react';
import { openLiveSession } from '../api/live';

export function useLiveAPI(routeContext: string, languageCode: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const ws = openLiveSession(routeContext, languageCode);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'transcript' && msg.text) {
          setTranscript((prev) => [...prev, String(msg.text)]);
        }
      } catch {
        // ignore non-JSON frames
      }
    };
    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'context', routeContext }));
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    wsRef.current = ws;
  }, [routeContext, languageCode]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const sendAudio = useCallback((base64Audio: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'audio', data: base64Audio }));
  }, []);

  const sendText = useCallback((text: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'text', text }));
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return { connect, disconnect, sendAudio, sendText, transcript, connected };
}
