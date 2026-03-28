import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { submitReport, REPORT_CATEGORIES, ReportCategory } from '../services/reports';
import { THEME_MODES } from '../store/LanguageContext';
import * as Icons from 'lucide-react';

interface ReportButtonProps {
  lat: number;
  lng: number;
  profile: string;
  th: typeof THEME_MODES['day'];
}

export const ReportButton = ({ lat, lng, profile, th }: ReportButtonProps) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReportCategory | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await submitReport(selected, note, lat, lng, profile);
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setSelected(null);
        setNote('');
      }, 1500);
    } catch (e) {
      console.error('Report failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: th.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}
        onPress={() => setOpen(true)}
      >
        <Icons.TriangleAlert size={16} color="#ef4444" />
        <Text style={styles.triggerText}>Report Issue</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.sheet, { backgroundColor: th.headerBg, borderColor: th.border }]}>
      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: th.text }]}>Report Accessibility Issue</Text>
        <TouchableOpacity onPress={() => setOpen(false)}>
          <Icons.X size={20} color={th.textMuted} />
        </TouchableOpacity>
      </View>

      {submitted ? (
        <View style={styles.successRow}>
          <Icons.CheckCircle size={24} color="#10b981" />
          <Text style={[styles.successText, { color: th.text }]}>Thanks! Report submitted.</Text>
        </View>
      ) : (
        <>
          <View style={styles.categories}>
            {(Object.keys(REPORT_CATEGORIES) as ReportCategory[]).map((key) => {
              const cat = REPORT_CATEGORIES[key];
              const active = selected === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelected(key)}
                  style={[
                    styles.catChip,
                    { backgroundColor: th.surface, borderColor: th.border },
                    active && { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' },
                  ]}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catLabel, { color: active ? '#ef4444' : th.textSecondary }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={[styles.noteInput, { backgroundColor: th.surface, borderColor: th.border, color: th.text }]}
            placeholder="Add a note (optional)"
            placeholderTextColor={th.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
          />

          <TouchableOpacity
            style={[styles.submitBtn, !selected && { opacity: 0.4 }]}
            onPress={handleSubmit}
            disabled={!selected || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitText}>Submit Report</Text>
            }
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1,
    height: 52, cursor: 'pointer' as any,
  },
  triggerText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  sheet: {
    borderRadius: 20, borderWidth: 1, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1,
    cursor: 'pointer' as any,
  },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 12, fontWeight: '600' },
  noteInput: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    fontSize: 14, minHeight: 60,
  },
  submitBtn: {
    backgroundColor: '#ef4444', height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 },
  successText: { fontSize: 15, fontWeight: '600' },
});
