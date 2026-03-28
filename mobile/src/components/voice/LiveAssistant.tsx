/**
 * LiveAssistant — Gemini Live API session with camera + mic input, audio output.
 * UI: small draggable PiP box (tap to zoom, drag to move). No full-screen overlay.
 */

import React from 'react';
import { useProfile } from '../../store/ProfileContext';
import { useLanguage } from '../../store/LanguageContext';
import { useRoute } from '../../store/RouteContext';
import { rerouteSegment } from '../../services/api';
import * as Icons from 'lucide-react';

const BASE = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000';
const WS_BASE = BASE.replace(/^http/, 'ws');

interface LiveAssistantProps {}

// PiP sizes
const PIP_SMALL  = { w: 108, h: 144 }; // 3:4
const PIP_ZOOMED = { w: 162, h: 216 }; // 1.5×

export const LiveAssistant = (_props: LiveAssistantProps) => {
  const { selectedProfile } = useProfile();
  const { language } = useLanguage();
  const { activeRoute, routes, setActiveRoute } = useRoute();

  const [isOpen,   setIsOpen]   = React.useState(false);
  const [status,   setStatus]   = React.useState<'idle'|'connecting'|'listening'|'speaking'|'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [zoomed,   setZoomed]   = React.useState(false);
  const [lastText, setLastText] = React.useState('');
  const [bubbleKey, setBubbleKey] = React.useState(0); // re-mount to replay fade animation

  // Drag state
  const [translate, setTranslate] = React.useState({ x: 0, y: 0 });
  const translateRef = React.useRef({ x: 0, y: 0 });

  // Media / WS refs
  const wsRef           = React.useRef<WebSocket | null>(null);
  const mediaRef        = React.useRef<MediaStream | null>(null);
  const videoRef        = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef       = React.useRef<HTMLCanvasElement | null>(null);
  const captureCtxRef   = React.useRef<AudioContext | null>(null);
  const playbackCtxRef  = React.useRef<AudioContext | null>(null);
  const processorRef    = React.useRef<ScriptProcessorNode | null>(null);
  const videoTimerRef   = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const nextPlayTimeRef = React.useRef(0);
  const wrapperRef      = React.useRef<HTMLDivElement | null>(null);

  // ── Drag via Pointer Events ─────────────────────────────────────────────────

  React.useEffect(() => {
    if (!isOpen) return;
    const el = wrapperRef.current;
    if (!el) return;

    let startX = 0, startY = 0, startTx = 0, startTy = 0, moved = false;

    const onDown = (e: PointerEvent) => {
      // Ignore close button clicks
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      startX  = e.clientX;
      startY  = e.clientY;
      startTx = translateRef.current.x;
      startTy = translateRef.current.y;
      moved   = false;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };

    const onMove = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      const next = { x: startTx + dx, y: startTy + dy };
      translateRef.current = next;
      setTranslate(next);
    };

    const onUp = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = 'grab';
      // Tap (no drag) → toggle zoom
      if (!moved) setZoomed(z => !z);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup',   onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup',   onUp);
    };
  }, [isOpen]);

  // ── Audio playback ──────────────────────────────────────────────────────────

  const getPlaybackCtx = (sampleRate: number): AudioContext => {
    if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
      playbackCtxRef.current = new AudioContext({ sampleRate });
      nextPlayTimeRef.current = 0;
    }
    return playbackCtxRef.current;
  };

  const enqueueAudio = (b64: string, mimeType: string) => {
    const rate = parseInt(mimeType.match(/rate=(\d+)/)?.[1] ?? '24000');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const ctx = getPlaybackCtx(rate);
    if (ctx.state === 'suspended') ctx.resume();
    const buf = ctx.createBuffer(1, float32.length, rate);
    buf.copyToChannel(float32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    const start = Math.max(now, nextPlayTimeRef.current);
    src.start(start);
    nextPlayTimeRef.current = start + buf.duration;
    setStatus('speaking');
    src.onended = () => setStatus('listening');
  };

  // ── Mic capture ─────────────────────────────────────────────────────────────

  const startMicCapture = (stream: MediaStream) => {
    const ctx = new AudioContext({ sampleRate: 16000 });
    captureCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    processor.onaudioprocess = (e) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      const f32 = e.inputBuffer.getChannelData(0);
      const i16 = new Int16Array(f32.length);
      for (let i = 0; i < f32.length; i++)
        i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768));
      const b64 = btoa(String.fromCharCode(...new Uint8Array(i16.buffer)));
      wsRef.current.send(JSON.stringify({ type: 'audio', data: b64, mimeType: 'audio/pcm;rate=16000' }));
    };
    source.connect(processor);
    processor.connect(ctx.destination);
  };

  // ── Video capture (1 fps) ───────────────────────────────────────────────────

  const startVideoCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    videoTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      canvas.width = 320; canvas.height = 240;
      const ctx2d = canvas.getContext('2d');
      if (!ctx2d) return;
      ctx2d.drawImage(video, 0, 0, 320, 240);
      const b64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      wsRef.current.send(JSON.stringify({ type: 'video', data: b64, mimeType: 'image/jpeg' }));
    }, 1000);
  };

  // ── Reroute tool handler ────────────────────────────────────────────────────

  const handleReroute = async (ws: WebSocket, callId: string, segmentId: string, reason: string) => {
    const sendResponse = (output: string) => ws.readyState === WebSocket.OPEN && ws.send(
      JSON.stringify({ type: 'toolResponse', data: { functionResponses: [{ id: callId, response: { output } }] } })
    );

    setLastText(`Rerouting around barrier…`);
    setBubbleKey(k => k + 1);

    const route = activeRoute;
    if (!route) return sendResponse('No active route to reroute.');

    const segIdx = route.segments.findIndex(s => s.id === segmentId);
    if (segIdx === -1) return sendResponse(`Segment ${segmentId} not found in the active route.`);

    try {
      const replacement = await rerouteSegment(route.segments[segIdx], selectedProfile?.id ?? 'wheelchair');
      const updatedSegments = [
        ...route.segments.slice(0, segIdx),
        ...replacement,
        ...route.segments.slice(segIdx + 1),
      ];
      setActiveRoute({ ...route, segments: updatedSegments });
      sendResponse(`Rerouted successfully. ${replacement.length} replacement segment(s) applied. Reason: ${reason}`);
    } catch {
      sendResponse('Reroute request failed — please try again.');
    }
  };

  // ── Session lifecycle ───────────────────────────────────────────────────────

  const startSession = async () => {
    setStatus('connecting');
    setLastText('');
    setTranslate({ x: 0, y: 0 });
    translateRef.current = { x: 0, y: 0 };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'environment', width: 320, height: 240 },
      });
    } catch {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { setStatus('error'); setErrorMsg('Camera/mic permission denied'); return; }
    }
    mediaRef.current = stream;

    if (videoRef.current && stream.getVideoTracks().length > 0) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }

    const ws = new WebSocket(`${WS_BASE}/api/live`);
    wsRef.current = ws;

    ws.onopen = () => {
      const routeCtx = activeRoute ? [activeRoute] : routes?.slice(0, 3);
      ws.send(JSON.stringify({
        setup: {
          profile: selectedProfile?.id ?? 'wheelchair',
          languageCode: language,
          responseModalities: ['AUDIO'],
          routes: routeCtx,
        },
      }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string);
      if (msg.type === 'setupComplete') {
        setStatus('listening');
        startMicCapture(stream);
        startVideoCapture();
      }
      if (msg.type === 'audioChunk') enqueueAudio(msg.data, msg.mimeType ?? 'audio/pcm;rate=24000');
      if (msg.type === 'text' && msg.content?.trim()) {
        setLastText(msg.content.trim());
        setBubbleKey(k => k + 1);
      }
      if (msg.type === 'toolCall') {
        const calls: Array<{ id: string; name: string; args: Record<string, string> }> =
          msg.data?.functionCalls ?? [];
        calls.forEach(call => {
          if (call.name === 'reroute_around_segment') handleReroute(ws, call.id, call.args.segment_id, call.args.reason);
        });
      }
      if (msg.type === 'error') { setErrorMsg(msg.message ?? 'Unknown error'); setStatus('error'); }
    };

    ws.onerror = () => { setErrorMsg('Could not reach backend'); setStatus('error'); };
    ws.onclose = () => {};
  };

  const stopSession = () => {
    wsRef.current?.close(); wsRef.current = null;
    processorRef.current?.disconnect(); processorRef.current = null;
    captureCtxRef.current?.close(); captureCtxRef.current = null;
    playbackCtxRef.current?.close(); playbackCtxRef.current = null;
    if (videoTimerRef.current) { clearInterval(videoTimerRef.current); videoTimerRef.current = null; }
    mediaRef.current?.getTracks().forEach(t => t.stop()); mediaRef.current = null;
    nextPlayTimeRef.current = 0;
    setStatus('idle');
  };

  const handleOpen  = () => { setIsOpen(true); startSession(); };
  const handleClose = () => { stopSession(); setIsOpen(false); setLastText(''); setZoomed(false); };

  // ── Render ──────────────────────────────────────────────────────────────────

  const isActive = isOpen && status !== 'idle' && status !== 'error';
  const hasRoute = !!(routes?.length || activeRoute);
  const pip = zoomed ? PIP_ZOOMED : PIP_SMALL;

  const borderColor =
    status === 'listening' ? '#10b981' :
    status === 'speaking'  ? '#3b82f6' :
    status === 'error'     ? '#ef4444' : '#374151';

  return (
    <>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @keyframes bubble-in-out {
          0%   { opacity: 0; transform: translateY(6px); }
          12%  { opacity: 1; transform: translateY(0); }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* ── Trigger button ── */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        title={isOpen ? 'End live session' : 'Live accessibility assistant'}
        style={{
          width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: isActive ? '#ef4444' : hasRoute ? '#7c3aed' : '#374151',
          flexShrink: 0, position: 'relative', transition: 'background-color 0.2s',
        }}
      >
        {isActive ? <Icons.PhoneOff size={18} color="#ffffff" /> : <Icons.Scan size={18} color="#ffffff" />}
        {isActive && (
          <span style={{
            position: 'absolute', inset: -4, borderRadius: 24,
            border: '2px solid rgba(239,68,68,0.5)',
            animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
          }} />
        )}
      </button>

      {/* ── PiP camera box + bubble ── */}
      {isOpen && (
        <div
          ref={wrapperRef}
          style={{
            position: 'absolute',
            bottom: 90,
            right: 16,
            transform: `translate(${translate.x}px, ${translate.y}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
            zIndex: 2000,
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
          } as React.CSSProperties}
        >
          {/* Transcript bubble — appears above the PiP, fades after 5s */}
          {lastText && (
            <div
              key={bubbleKey}
              style={{
                maxWidth: 200,
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                fontSize: 12,
                lineHeight: '17px',
                padding: '8px 11px',
                borderRadius: '10px 10px 4px 10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                animation: 'bubble-in-out 5s ease forwards',
                pointerEvents: 'none',
              }}
            >
              {lastText}
            </div>
          )}

          {/* Error bubble */}
          {status === 'error' && (
            <div style={{
              maxWidth: 200, backgroundColor: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#fca5a5', fontSize: 11, lineHeight: '16px',
              padding: '7px 10px', borderRadius: '10px 10px 4px 10px',
            }}>
              {errorMsg}
            </div>
          )}

          {/* Camera PiP */}
          <div style={{
            width: pip.w, height: pip.h,
            borderRadius: 14, overflow: 'hidden',
            border: `2.5px solid ${borderColor}`,
            boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
            backgroundColor: '#000',
            transition: 'width 0.2s ease, height 0.2s ease, border-color 0.3s',
            position: 'relative',
            flexShrink: 0,
          }}>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Status dot */}
            <div style={{
              position: 'absolute', top: 6, left: 6,
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: borderColor,
              animation: (status === 'listening' || status === 'speaking')
                ? 'live-pulse 1.4s ease-in-out infinite' : 'none',
              boxShadow: `0 0 4px ${borderColor}`,
            }} />

            {/* Zoom hint */}
            <div style={{
              position: 'absolute', bottom: 5, left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.4)', fontSize: 9, pointerEvents: 'none',
              letterSpacing: '0.03em',
            }}>
              {zoomed ? 'tap to shrink' : 'tap to zoom'}
            </div>

            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleClose(); }}
              style={{
                position: 'absolute', top: 4, right: 4,
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: 'rgba(0,0,0,0.55)', border: 'none',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icons.X size={11} color="#ffffff" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
