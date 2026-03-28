import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { THEME_MODES } from '../store/LanguageContext';
import * as Icons from 'lucide-react';

interface LiveCameraGuideProps {
  currentInstruction: string;
  currentDistance: string;
  destination: string;
  profileName?: string;
  th: typeof THEME_MODES['day'];
  onSpeak: (text: string) => void; // passes guidance to TTS
}

const INTERVAL_MS = 5000; // analyze every 5 seconds

export const LiveCameraGuide = ({
  currentInstruction,
  currentDistance,
  destination,
  profileName,
  th,
  onSpeak,
}: LiveCameraGuideProps) => {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'analyzing' | 'error'>('idle');
  const [lastGuidance, setLastGuidance] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzingRef = useRef(false);

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStatus('idle');
    setLastGuidance(null);
  };

  const captureAndAnalyze = async (instruction: string, dist: string, dest: string) => {
    if (analyzingRef.current || !videoRef.current) return;
    analyzingRef.current = true;
    setStatus('analyzing');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];

      const apiKey = process.env.GEMINI_API_KEY;
      const prompt = `You are a real-time navigation assistant for a ${profileName || 'accessibility'} user.

Current navigation instruction: "${instruction}" in ${dist}.
Destination: ${dest}.

Look at this camera frame and give ONE short spoken sentence (max 20 words) of real-time guidance.
Focus on: immediate obstacles, confirming the correct path, or warning about hazards like steps, narrow paths, or uneven surfaces.
Speak directly to the user. Example: "Clear path ahead, ramp is on your right." or "Stairs ahead — turn right to find the accessible route."`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 60 },
          }),
        }
      );

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        setLastGuidance(text);
        onSpeak(text);
      }
      setStatus('live');
    } catch {
      setStatus('live'); // silently continue on error
    } finally {
      analyzingRef.current = false;
    }
  };

  const startCamera = async () => {
    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('live');
      setEnabled(true);
    } catch {
      setStatus('error');
      setEnabled(false);
    }
  };

  // Start/stop interval when status becomes live
  useEffect(() => {
    if (status !== 'live') return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      captureAndAnalyze(currentInstruction, currentDistance, destination);
    }, INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, currentInstruction, currentDistance, destination]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), []);

  const toggle = () => {
    if (enabled) {
      stopCamera();
      setEnabled(false);
    } else {
      startCamera();
    }
  };

  return (
    <View>
      {/* Toggle button */}
      <TouchableOpacity
        style={[
          styles.btn,
          { borderColor: enabled ? '#3b82f6' : th.border, backgroundColor: enabled ? 'rgba(59,130,246,0.12)' : th.surface },
        ]}
        onPress={toggle}
      >
        {status === 'starting' ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : (
          <Icons.Camera size={18} color={enabled ? '#3b82f6' : th.textSecondary} />
        )}
        <Text style={[styles.btnText, { color: enabled ? '#3b82f6' : th.textSecondary }]}>
          {status === 'analyzing' ? 'Analyzing…' : enabled ? 'Vision On' : 'Vision'}
        </Text>
        {status === 'analyzing' && <ActivityIndicator size="small" color="#3b82f6" />}
      </TouchableOpacity>

      {/* Hidden video element */}
      {enabled && (
        <video
          ref={videoRef}
          style={{ display: 'none' } as React.CSSProperties}
          playsInline
          muted
        />
      )}

      {/* Last guidance bubble */}
      {enabled && lastGuidance && (
        <View style={[styles.guidanceBubble, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Icons.Eye size={13} color="#3b82f6" />
          <Text style={[styles.guidanceText, { color: th.textSecondary }]} numberOfLines={3}>
            {lastGuidance}
          </Text>
        </View>
      )}

      {status === 'error' && (
        <Text style={styles.errorText}>Camera access denied</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
    cursor: 'pointer' as any,
  },
  btnText: { fontSize: 13, fontWeight: '600' },
  guidanceBubble: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: 8, padding: 10, borderRadius: 12, borderWidth: 1,
  },
  guidanceText: { flex: 1, fontSize: 12, lineHeight: 17 },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 4 },
});
