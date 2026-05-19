// app/event-history.tsx
// Shows all events the current user has registered for — "participated history"

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMyRegisteredEvents, Event } from '../firebase/eventService';
import { auth } from '../firebase/firebaseConfig';

type GroupedEvents = {
  label: string;
  events: Event[];
};

function groupByMonth(events: Event[]): GroupedEvents[] {
  const map: Record<string, Event[]> = {};
  for (const event of events) {
    const label = extractMonthLabel(event.time);
    if (!map[label]) map[label] = [];
    map[label].push(event);
  }
  return Object.entries(map).map(([label, evts]) => ({ label, events: evts }));
}

function extractMonthLabel(timeStr: string): string {
  if (!timeStr) return 'Other';
  const monthYearMatch = timeStr.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i
  );
  if (monthYearMatch) return monthYearMatch[0];
  const isoMatch = timeStr.match(/\d{4}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  return 'Other';
}

const STATUS_COLORS: Record<string, string> = {
  approved: '#22c55e',
  pending: '#f59e0b',
  rejected: '#ef4444',
};

export default function EventHistory() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [grouped, setGrouped] = useState<GroupedEvents[]>([]);

  // useFocusEffect re-runs every time this screen comes into focus
  // This fixes the "history not updating" bug — previously only ran once on mount
  useFocusEffect(
    useCallback(() => {
      if (!auth.currentUser) {
        router.replace('/login');
        return;
      }
      setLoading(true);
      fetchMyRegisteredEvents()
        .then((evts) => {
          setEvents(evts);
          setGrouped(groupByMonth(evts));
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backBtn}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        <Text style={styles.heading}>Events Participated</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{events.length}</Text>
        </View>
      </View>
      <Text style={styles.subheading}>Your full event registration history</Text>

      {events.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyText}>Events you register for will appear here.</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/')}>
            <Text style={styles.browseButtonText}>Browse Events →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        grouped.map((group) => (
          <View key={group.label} style={styles.group}>
            <View style={styles.monthRow}>
              <View style={styles.monthLine} />
              <Text style={styles.monthLabel}>{group.label}</Text>
              <View style={styles.monthLine} />
            </View>

            {group.events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.card}
                onPress={() => router.push(`/event-details?id=${event.id}`)}
                activeOpacity={0.8}
              >
                {event.posterUrl ? (
                  <Image source={{ uri: event.posterUrl }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Text style={styles.thumbEmoji}>🎓</Text>
                  </View>
                )}

                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.categoryPill, { backgroundColor: getCategoryColor(event.category) + '22' }]}>
                      <Text style={[styles.categoryPillText, { color: getCategoryColor(event.category) }]}>
                        {event.category}
                      </Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[event.status] ?? '#888' }]} />
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
                  <Text style={styles.cardVenue} numberOfLines={1}>📍 {event.venue}</Text>
                  <Text style={styles.cardTime}>🕒 {event.time}</Text>
                  {event.deadline && (
                    <Text style={styles.cardDeadline}>⏰ Deadline: {event.deadline}</Text>
                  )}
                </View>

                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    Hackathon: '#4f46e5',
    Workshop: '#0ea5e9',
    Seminar: '#8b5cf6',
    Cultural: '#f59e0b',
    Sports: '#22c55e',
    Other: '#6b7280',
  };
  return map[category] ?? '#6b7280';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },

  backBtn: { color: '#4f46e5', fontSize: 16, fontWeight: '600', marginBottom: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  heading: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  countBadge: {
    backgroundColor: '#4f46e5', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countBadgeText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  subheading: { color: '#666', fontSize: 13, marginBottom: 28 },

  group: { marginBottom: 8 },

  monthRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 8,
  },
  monthLine: { flex: 1, height: 1, backgroundColor: '#2a2a2a' },
  monthLabel: {
    color: '#888', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.2,
  },

  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },

  thumb: { width: 80, height: 80 },
  thumbPlaceholder: {
    width: 80, height: 80,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center', alignItems: 'center',
  },
  thumbEmoji: { fontSize: 28 },

  cardBody: { flex: 1, padding: 12, gap: 3 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  categoryPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  categoryPillText: { fontSize: 10, fontWeight: '700' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  cardTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', lineHeight: 20 },
  cardVenue: { color: '#888', fontSize: 12 },
  cardTime: { color: '#888', fontSize: 12 },
  cardDeadline: { color: '#f59e0b', fontSize: 11, fontWeight: '600', marginTop: 2 },

  arrow: { color: '#444', fontSize: 24, paddingHorizontal: 12 },

  emptyBox: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center' },
  browseButton: {
    backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 10,
  },
  browseButtonText: { color: 'white', fontWeight: '700', fontSize: 15 },
});