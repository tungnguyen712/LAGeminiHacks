import {
  collection, addDoc, query, where,
  orderBy, onSnapshot, Timestamp, getDocs, deleteDoc, doc,
} from 'firebase/firestore';
import { db } from './firebase';

export type ReportCategory =
  | 'broken_ramp'
  | 'missing_curb_cut'
  | 'blocked_path'
  | 'unsafe_surface'
  | 'no_audio_signal'
  | 'other';

export interface AccessibilityReport {
  id?: string;
  category: ReportCategory;
  note: string;
  lat: number;
  lng: number;
  profile: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export const REPORT_CATEGORIES: Record<ReportCategory, { label: string; emoji: string }> = {
  broken_ramp:      { label: 'Broken Ramp',       emoji: '♿' },
  missing_curb_cut: { label: 'Missing Curb Cut',   emoji: '🚧' },
  blocked_path:     { label: 'Blocked Path',        emoji: '⛔' },
  unsafe_surface:   { label: 'Unsafe Surface',      emoji: '⚠️' },
  no_audio_signal:  { label: 'No Audio Signal',     emoji: '🔇' },
  other:            { label: 'Other Issue',          emoji: '📍' },
};

const REPORTS_COL = 'accessibility_reports';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function submitReport(
  category: ReportCategory,
  note: string,
  lat: number,
  lng: number,
  profile: string,
): Promise<void> {
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + THIRTY_DAYS_MS);
  await addDoc(collection(db, REPORTS_COL), {
    category, note, lat, lng, profile,
    createdAt: now,
    expiresAt,
  });
}

export function subscribeToNearbyReports(
  centerLat: number,
  centerLng: number,
  radiusDeg: number = 0.05, // ~5km
  callback: (reports: AccessibilityReport[]) => void,
): () => void {
  const now = Timestamp.now();
  const q = query(
    collection(db, REPORTS_COL),
    where('expiresAt', '>', now),
    orderBy('expiresAt', 'asc'),
  );

  return onSnapshot(q, (snap) => {
    const reports: AccessibilityReport[] = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as AccessibilityReport))
      .filter(r =>
        Math.abs(r.lat - centerLat) < radiusDeg &&
        Math.abs(r.lng - centerLng) < radiusDeg
      );
    callback(reports);
  });
}

export async function cleanExpiredReports(): Promise<void> {
  const now = Timestamp.now();
  const q = query(collection(db, REPORTS_COL), where('expiresAt', '<=', now));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, REPORTS_COL, d.id))));
}
