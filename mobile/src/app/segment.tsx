import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute } from '../store/RouteContext';
import { useProfile } from '../store/ProfileContext';
import { useLanguage, THEME_MODES } from '../store/LanguageContext';
import { SegmentPanel } from '../components/route/SegmentPanel';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RouteInsights {
  lookOut: string[];
  highlights: string[];
  avoid: string[];
}

const generateInsights = async (
  origin: string,
  destination: string,
  profileName: string,
  profileDesc: string,
  segments: { instruction: string; friction: string; details?: string }[]
): Promise<RouteInsights> => {
  const apiKey = process.env.GEMINI_API_KEY;

  const segmentSummary = segments
    .map((s, i) => `Step ${i + 1}: ${s.instruction} (friction: ${s.friction}${s.details ? ', note: ' + s.details : ''})`)
    .join('\n');

  const prompt = `You are an expert accessibility navigation assistant for PathSense app.
A "${profileName}" user (${profileDesc}) is walking from "${origin}" to "${destination}".

Route steps:
${segmentSummary}

Generate practical, specific, and encouraging insights for this user. Respond ONLY with valid JSON in exactly this format:
{
  "lookOut": ["3 specific things to watch carefully for safety or accessibility on this route"],
  "highlights": ["3 interesting or enjoyable things to notice or experience along this route"],
  "avoid": ["3 specific obstacles, hazards, or areas to skip for this user's needs"]
}

Keep each item concise (under 15 words). Be specific to the route and profile.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
      }
    );
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return JSON.parse(text);
  } catch (e) {
    console.warn('Gemini error:', e);
  }

  // Fallback if API fails
  return {
    lookOut: [
      'Watch for uneven pavement near intersections',
      'Check signal timing before crossing busy roads',
      'Look for temporary construction blocking accessible paths',
    ],
    highlights: [
      'Enjoy street-level views along the main boulevard',
      'Notice local murals and public art installations',
      'Accessible seating areas available at midpoint park',
    ],
    avoid: [
      'Avoid the alley shortcut — no curb cuts available',
      'Skip the cobblestone plaza on the east side',
      'Bypass the steep ramp near the parking garage',
    ],
  };
};

const InsightCard = ({ icon, title, items, color, surface, border, text, textSecondary }: {
  icon: React.ReactNode; title: string; items: string[];
  color: string; surface: string; border: string; text: string; textSecondary: string;
}) => (
  <View style={[styles.insightCard, { backgroundColor: surface, borderColor: border }]}>
    <View style={styles.insightHeader}>
      {icon}
      <Text style={[styles.insightTitle, { color }]}>{title}</Text>
    </View>
    {items.map((item, i) => (
      <View key={i} style={styles.insightRow}>
        <View style={[styles.insightDot, { backgroundColor: color }]} />
        <Text style={[styles.insightText, { color: textSecondary }]}>{item}</Text>
      </View>
    ))}
  </View>
);

export const SegmentScreen = () => {
  const { activeRoute, origin, destination } = useRoute();
  const { selectedProfile } = useProfile();
  const { themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const navigate = useNavigate();

  const [insights, setInsights] = useState<RouteInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeRoute) { navigate('/results'); return; }
    generateInsights(
      origin || 'your location',
      destination || 'your destination',
      selectedProfile?.name || 'General User',
      selectedProfile?.description || 'Accessibility-focused traveler',
      activeRoute.segments
    ).then((data) => {
      setInsights(data);
      setLoading(false);
    });
  }, []);

  if (!activeRoute) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: th.headerBg, borderBottomColor: th.border }]}>
        <TouchableOpacity onPress={() => navigate('/results')} style={[styles.backButton, { backgroundColor: th.surface }]}>
          <Icons.ArrowLeft size={24} color={th.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: th.text }]}>Route Details</Text>
          <Text style={[styles.subtitle, { color: th.textSecondary }]}>
            {activeRoute.name} • {activeRoute.totalDistance}
          </Text>
        </View>
        {selectedProfile && (
          <View style={[styles.profileChip, { backgroundColor: th.surface }]}>
            <Text style={styles.profileEmoji}>{selectedProfile.emoji}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* AI Insights */}
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <Icons.Sparkles size={16} color="#a855f7" />
            <Text style={[styles.aiLabel, { color: th.textMuted }]}>AI Insights for {selectedProfile?.name ?? 'You'}</Text>
          </View>

          {loading ? (
            <View style={[styles.loadingCard, { backgroundColor: th.surface, borderColor: th.border }]}>
              <ActivityIndicator color="#a855f7" />
              <Text style={[styles.loadingText, { color: th.textSecondary }]}>Generating personalized insights…</Text>
            </View>
          ) : insights ? (
            <>
              <InsightCard
                icon={<Icons.Eye size={18} color="#f59e0b" />}
                title="Look Out For"
                items={insights.lookOut}
                color="#f59e0b"
                surface={th.surface}
                border={th.border}
                text={th.text}
                textSecondary={th.textSecondary}
              />
              <InsightCard
                icon={<Icons.Star size={18} color="#10b981" />}
                title="Things to See"
                items={insights.highlights}
                color="#10b981"
                surface={th.surface}
                border={th.border}
                text={th.text}
                textSecondary={th.textSecondary}
              />
              <InsightCard
                icon={<Icons.ShieldAlert size={18} color="#ef4444" />}
                title="Things to Avoid"
                items={insights.avoid}
                color="#ef4444"
                surface={th.surface}
                border={th.border}
                text={th.text}
                textSecondary={th.textSecondary}
              />
            </>
          ) : null}
        </View>

        {/* Route Steps */}
        <View style={styles.stepsSection}>
          <View style={styles.aiHeader}>
            <Icons.MapPin size={16} color="#3b82f6" />
            <Text style={[styles.aiLabel, { color: th.textMuted }]}>Route Steps</Text>
          </View>
          <SegmentPanel segments={activeRoute.segments} />
        </View>

      </ScrollView>

      <View style={[styles.footer, { backgroundColor: th.headerBg, borderTopColor: th.border }]}>
        <TouchableOpacity style={styles.button} onPress={() => navigate('/navigate')}>
          <Text style={styles.buttonText}>Start Navigation</Text>
          <Icons.Navigation2 size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40,
    gap: 12, borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 14, fontWeight: '500' },
  profileChip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  profileEmoji: { fontSize: 20 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 24, paddingBottom: 100 },
  aiSection: { gap: 12 },
  stepsSection: { gap: 12 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 20, borderRadius: 16, borderWidth: 1,
  },
  loadingText: { fontSize: 14, fontWeight: '500' },
  insightCard: { borderRadius: 16, padding: 16, gap: 10, borderWidth: 1 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  insightTitle: { fontSize: 15, fontWeight: '700' },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  insightText: { flex: 1, fontSize: 14, lineHeight: 20 },
  footer: { padding: 20, paddingBottom: 40, borderTopWidth: 1 },
  button: {
    backgroundColor: '#3b82f6', height: 56, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
