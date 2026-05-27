import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
    collection,
    doc,
    getDocs, orderBy, query,
    updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    ScrollView, StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../firebase/firebaseConfig';

type Feedback = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  rating: number;
  category: string;
  message: string;
  platform: string;
  status: 'unread' | 'reviewed' | 'resolved';
  createdAt: any;
};

const CATEGORIES = ['All', 'General', 'Bug Report', 'Feature Request', 'UI/UX', 'Performance'];
const STATUSES = ['All', 'unread', 'reviewed', 'resolved'];

const STATUS_COLORS: Record<string, string> = {
  unread: '#ef4444',
  reviewed: '#f59e0b',
  resolved: '#22c55e',
};

const RATING_EMOJI = ['', '😠', '😕', '😐', '😊', '😍'];

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadFeedback(); }, []);

  const loadFeedback = async () => {
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Feedback[];
      setFeedbacks(data);
    } catch (err) {
      Alert.alert('Error loading feedback');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'feedback', id), { status });
    setFeedbacks(prev =>
      prev.map(f => f.id === id ? { ...f, status: status as any } : f)
    );
  };

  const exportCSV = async () => {
    const rows = filtered.map(f => [
      f.createdAt?.toDate?.().toLocaleString() ?? '',
      f.name, f.email, f.role, f.department,
      f.rating, f.category,
      f.platform, f.status,
      `"${(f.message ?? '').replace(/"/g, '""')}"`,
    ].join(','));

    const csv = [
      'Timestamp,Name,Email,Role,Department,Rating,Category,Platform,Status,Message',
      ...rows,
    ].join('\n');

    const path = FileSystem.documentDirectory + 'app_feedback.csv';
    await FileSystem.writeAsStringAsync(path, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(path);
  };

  const filtered = feedbacks.filter(f => {
    const catMatch = filterCat === 'All' || f.category === filterCat;
    const statusMatch = filterStatus === 'All' || f.status === filterStatus;
    return catMatch && statusMatch;
  });

  // Summary stats
  const avgRating = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
    : '—';
  const unreadCount = feedbacks.filter(f => f.status === 'unread').length;
  const byCategory = CATEGORIES.slice(1).map(cat => ({
    cat,
    count: feedbacks.filter(f => f.category === cat).length,
  }));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
          <Text style={styles.exportText}>⬇ Export CSV</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.heading}>App Feedback</Text>

      {/* Summary Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{feedbacks.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#facc15' }]}>⭐ {avgRating}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>By Category</Text>
        {byCategory.map(({ cat, count }) => (
          <View key={cat} style={styles.catBreakdownRow}>
            <Text style={styles.catBreakdownLabel}>{cat}</Text>
            <View style={styles.barTrack}>
              <View style={[
                styles.barFill,
                { width: `${feedbacks.length ? (count / feedbacks.length) * 100 : 0}%` }
              ]} />
            </View>
            <Text style={styles.catBreakdownCount}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <Text style={styles.filterLabel}>Filter by Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, filterCat === cat && styles.chipActive]}
            onPress={() => setFilterCat(cat)}
          >
            <Text style={[styles.chipText, filterCat === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>Filter by Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, filterStatus === s && styles.chipActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.chipText, filterStatus === s && styles.chipTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.resultsCount}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>

      {/* Feedback Cards */}
      {filtered.map(f => (
        <TouchableOpacity
          key={f.id}
          style={styles.feedbackCard}
          onPress={() => setExpanded(expanded === f.id ? null : f.id)}
          activeOpacity={0.85}
        >
          {/* Top Row */}
          <View style={styles.feedbackTopRow}>
            <View style={styles.feedbackAvatar}>
              <Text style={styles.feedbackAvatarText}>
                {f.name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.feedbackName}>{f.name || 'Unknown'}</Text>
              <Text style={styles.feedbackMeta}>
                {f.role} · {f.department || 'N/A'} · {f.platform}
              </Text>
            </View>
            <View style={styles.feedbackRight}>
              <Text style={styles.feedbackRating}>
                {RATING_EMOJI[f.rating]} {f.rating}/5
              </Text>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[f.status] ?? '#888' }]} />
            </View>
          </View>

          {/* Category + Date */}
          <View style={styles.feedbackTagRow}>
            <View style={styles.catTag}>
              <Text style={styles.catTagText}>{f.category}</Text>
            </View>
            <Text style={styles.feedbackDate}>
              {f.createdAt?.toDate?.().toLocaleDateString() ?? ''}
            </Text>
          </View>

          {/* Message preview */}
          <Text style={styles.feedbackMessage} numberOfLines={expanded === f.id ? undefined : 2}>
            {f.message}
          </Text>

          {/* Expanded: status controls */}
          {expanded === f.id && (
            <View style={styles.statusRow}>
              <Text style={styles.statusRowLabel}>Mark as:</Text>
              {['unread', 'reviewed', 'resolved'].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusBtn,
                    { borderColor: STATUS_COLORS[s] },
                    f.status === s && { backgroundColor: STATUS_COLORS[s] + '33' },
                  ]}
                  onPress={() => updateStatus(f.id, s)}
                >
                  <Text style={[styles.statusBtnText, { color: STATUS_COLORS[s] }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 20, paddingTop: 50 },
  centered: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backText: { color: '#818cf8', fontSize: 15 },
  exportBtn: { backgroundColor: '#1e1b4b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#4f46e5' },
  exportText: { color: '#818cf8', fontSize: 13, fontWeight: '700' },
  heading: { color: 'white', fontSize: 26, fontWeight: 'bold', marginBottom: 20 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  statValue: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 4 },

  card: { backgroundColor: '#1e1e1e', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#2a2a2a' },
  sectionTitle: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 14 },
  catBreakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  catBreakdownLabel: { color: '#aaa', fontSize: 13, width: 110 },
  barTrack: { flex: 1, height: 6, backgroundColor: '#2a2a2a', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#4f46e5', borderRadius: 3 },
  catBreakdownCount: { color: '#888', fontSize: 13, width: 24, textAlign: 'right' },

  filterLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  filterRow: { marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', marginRight: 8 },
  chipActive: { backgroundColor: '#1e1b4b', borderColor: '#4f46e5' },
  chipText: { color: '#888', fontSize: 13 },
  chipTextActive: { color: '#818cf8', fontWeight: '700' },
  resultsCount: { color: '#555', fontSize: 13, marginBottom: 12 },

  feedbackCard: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a' },
  feedbackTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  feedbackAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  feedbackAvatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  feedbackName: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  feedbackMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  feedbackRight: { alignItems: 'flex-end', gap: 6 },
  feedbackRating: { color: '#facc15', fontSize: 13, fontWeight: '700' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  feedbackTagRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  catTag: { backgroundColor: '#1e1b4b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  catTagText: { color: '#818cf8', fontSize: 12, fontWeight: '700' },
  feedbackDate: { color: '#555', fontSize: 12 },
  feedbackMessage: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#2a2a2a' },
  statusRowLabel: { color: '#666', fontSize: 13 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  statusBtnText: { fontSize: 12, fontWeight: '700' },
});