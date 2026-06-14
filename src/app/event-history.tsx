// app/event-history.tsx
// Shows all events the current user has registered for — "participated history"

import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
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

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Gradients } from '../constants/theme';
import { Event, fetchMyRegisteredEvents } from '../firebase/eventService';
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

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Hackathon: { bg: '#E0F2FE', text: '#0369A1', icon: 'code-slash-outline' },
  Workshop: { bg: '#DCFCE7', text: '#15803D', icon: 'construct-outline' },
  Seminar: { bg: '#FEF3C7', text: '#B45309', icon: 'mic-outline' },
  Cultural: { bg: '#FFE4E6', text: '#BE123C', icon: 'musical-notes-outline' },
  Sports: { bg: '#F3E8FF', text: '#7E22CE', icon: 'football-outline' },
  Other: { bg: '#F1F5F9', text: '#475569', icon: 'apps-outline' },
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  approved: { color: '#22C55E', label: 'Approved' },
  pending: { color: '#F59E0B', label: 'Pending' },
  rejected: { color: '#EF4444', label: 'Rejected' },
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
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
        <Ionicons name="chevron-back" size={20} color={Colors.light.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Hero header */}
      <LinearGradient colors={Gradients.light.sunrise} style={styles.heroPanel}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="ticket-outline" size={24} color="white" />
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{events.length}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Events Participated</Text>
        <Text style={styles.heroSub}>Your full event registration history</Text>
      </LinearGradient>

      {events.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}>
            <Ionicons name="file-tray-outline" size={30} color={Colors.light.primary} />
          </View>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyText}>Events you register for will appear here.</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/')}>
            <LinearGradient colors={Gradients.light.primary} style={styles.browseButton}>
              <Text style={styles.browseButtonText}>Browse Events</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </LinearGradient>
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

            {group.events.map((event) => {
              const category = event.category || 'Other';
              const palette = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other;
              const status = STATUS_META[event.status] ?? { color: '#94A3B8', label: event.status };

              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.card}
                  onPress={() => router.push(`/event-details?id=${event.id}`)}
                  activeOpacity={0.85}
                >
                  {event.posterUrl ? (
                    <Image source={{ uri: event.posterUrl }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={[palette.bg, '#FFFFFF']} style={styles.thumbPlaceholder}>
                      <Ionicons name={palette.icon} size={26} color={palette.text} />
                    </LinearGradient>
                  )}

                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <View style={[styles.categoryPill, { backgroundColor: palette.bg }]}>
                        <Text style={[styles.categoryPillText, { color: palette.text }]}>
                          {category}
                        </Text>
                      </View>
                      <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
                    <MetaRow icon="location-outline" text={event.venue} />
                    <MetaRow icon="time-outline" text={event.time} />
                    {event.deadline && (
                      <View style={styles.deadlineRow}>
                        <Ionicons name="alarm-outline" size={12} color="#B45309" />
                        <Text style={styles.cardDeadline}>Deadline: {event.deadline}</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              );
            })}
          </View>
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={12} color={Colors.light.textSecondary} />
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },

  // ── Back button ──
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  backText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
  },

  // ── Hero ──
  heroPanel: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  countBadgeText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
  },
  heroTitle: {
    color: Colors.light.text,
    fontSize: 22,
    fontFamily: 'Sora_700Bold',
    marginBottom: 4,
  },
  heroSub: {
    color: '#475569',
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
  },

  // ── Month group ──
  group: { marginBottom: 8 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    marginTop: 4,
  },
  monthLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  monthLabel: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  thumb: {
    width: 84,
    height: 96,
  },
  thumbPlaceholder: {
    width: 84,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardBody: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  categoryPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryPillText: {
    fontSize: 10,
    fontFamily: 'Sora_700Bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontFamily: 'Sora_700Bold',
  },

  cardTitle: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    flex: 1,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  cardDeadline: {
    color: '#B45309',
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
  },

  // ── Empty state ──
  emptyBox: {
    alignItems: 'center',
    marginTop: 36,
    paddingHorizontal: 20,
    paddingVertical: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: Colors.light.text,
    fontSize: 17,
    fontFamily: 'Sora_700Bold',
    marginBottom: 4,
  },
  emptyText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
  },
});