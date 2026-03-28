import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { THEME_MODES } from '../store/LanguageContext';
import * as Icons from 'lucide-react';

interface CameraAnalyzerProps {
  th: typeof THEME_MODES['day'];
  profileName?: string;
  onAnalysisReady?: (text: string) => void; // hook for teammate's TTS
}

export const CameraAnalyzer = ({ th, profileName, onAnalysisReady }: CameraAnalyzerProps) => {
  const [open, setOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch {
      setError('Camera access denied. Please allow camera permission.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current) return;
    setAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      // Capture frame from video
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

      const apiKey = process.env.GEMINI_API_KEY;
      const prompt = `You are an accessibility navigation assistant for a ${profileName || 'accessibility'} user.
Analyze this scene and provide a clear, helpful description focusing on:
1. What is directly ahead and around the user
2. Any accessibility hazards (steps, uneven surfaces, obstacles, narrow paths)
3. Path conditions and walkability
4. Any helpful landmarks or navigation cues
5. Safety concerns

Be concise, specific, and speak directly to the user as if guiding them in real time.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: base64 } },
              ],
            }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
          }),
        }
      );

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setResult(text);
        onAnalysisReady?.(text); // pass to teammate's TTS
      } else {
        setError('Could not analyze scene. Try again.');
      }
    } catch {
      setError('Analysis failed. Check your connection.');
    } finally {
      setAnalyzing(false);
    }
  }, [profileName, onAnalysisReady]);

  const handleClose = () => {
    stopCamera();
    setOpen(false);
    setResult(null);
    setError(null);
  };

  if (!open) {
    return (
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: th.isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)' }]}
        onPress={() => { setOpen(true); startCamera(); }}
      >
        <Icons.Camera size={16} color="#3b82f6" />
        <Text style={styles.triggerText}>Analyze Scene</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.sheet, { backgroundColor: th.headerBg, borderColor: th.border }]}>
      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: th.text }]}>Scene Analyzer</Text>
        <TouchableOpacity onPress={handleClose}>
          <Icons.X size={20} color={th.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Camera viewfinder */}
      <View style={styles.viewfinder}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
          playsInline
          muted
        />
        {!streaming && (
          <View style={styles.cameraLoading}>
            <ActivityIndicator color="#3b82f6" />
            <Text style={styles.cameraLoadingText}>Starting camera…</Text>
          </View>
        )}
        {/* Overlay corners for viewfinder feel */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      {/* Capture button */}
      <TouchableOpacity
        style={[styles.captureBtn, (!streaming || analyzing) && { opacity: 0.5 }]}
        onPress={captureAndAnalyze}
        disabled={!streaming || analyzing}
      >
        {analyzing
          ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.captureBtnText}>Analyzing…</Text></>
          : <><Icons.ScanEye size={20} color="#fff" /><Text style={styles.captureBtnText}>Analyze Scene</Text></>
        }
      </TouchableOpacity>

      {/* Result */}
      {result && (
        <ScrollView style={[styles.resultBox, { backgroundColor: th.surface, borderColor: th.border }]} nestedScrollEnabled>
          <View style={styles.resultHeader}>
            <Icons.Sparkles size={14} color="#a855f7" />
            <Text style={[styles.resultLabel, { color: th.textMuted }]}>Gemini Analysis</Text>
          </View>
          <Text style={[styles.resultText, { color: th.text }]}>{result}</Text>
        </ScrollView>
      )}

      {error && (
        <View style={styles.errorRow}>
          <Icons.AlertCircle size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const CORNER_SIZE = 16;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = '#3b82f6';

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1,
    width: '100%', cursor: 'pointer' as any,
  },
  triggerText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  sheet: {
    borderRadius: 20, borderWidth: 1, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  viewfinder: {
    height: 200, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#000', position: 'relative',
  } as any,
  cameraLoading: {
    position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 8,
  } as any,
  cameraLoadingText: { color: '#94a3b8', fontSize: 13 },
  corner: {
    position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE,
  } as any,
  cornerTL: { top: 8, left: 8, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR, borderTopLeftRadius: 4 } as any,
  cornerTR: { top: 8, right: 8, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR, borderTopRightRadius: 4 } as any,
  cornerBL: { bottom: 8, left: 8, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR, borderBottomLeftRadius: 4 } as any,
  cornerBR: { bottom: 8, right: 8, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR, borderBottomRightRadius: 4 } as any,
  captureBtn: {
    backgroundColor: '#3b82f6', height: 48, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: 'pointer' as any,
  },
  captureBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  resultBox: { borderWidth: 1, borderRadius: 14, padding: 14, maxHeight: 160 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  resultLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  resultText: { fontSize: 14, lineHeight: 22 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
});
