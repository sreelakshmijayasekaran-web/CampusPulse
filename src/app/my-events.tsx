// app/my-events.tsx
// Shows the events an organizer has posted — light theme matching index.tsx

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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMyEvents, Event } from '../firebase/eventService';
import { auth } from '../firebase/firebaseConfig';
import { Colors, Gradients } from '../constants/theme';

type GroupedEvents = { label: string; events: Event[] };

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

function groupByMonth(events: Event[]): GroupedEvents[] {
  const map: Record<string, Event[]> = {};
  for (const event of events) {
    const label = extractMonthLabel(event.time);
    if (!map[label]) map[label] = [];
    map[label].push(event);
  }
  return Object.entries(map).map(([label, evts]) => ({ label, events: evts }));
}

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = {
  approved: { label: 'Approved', color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle-outline' },
  pending:  { label: 'Pending',  color: '#B45309', bg: '#FEF3C7', icon: 'time-outline' },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

const CATEGORY_META: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Hackathon: { color: '#2563EB', bg: '#DBEAFE', icon: 'code-slash-outline' },
  Workshop:  { color: '#059669', bg: '#D1FAE5', icon: 'construct-outline' },
  Seminar:   { color: '#7C3AED', bg: '#EDE9FE', icon: 'mic-outline' },
  Cultural:  { color: '#B45309', bg: '#FEF3C7', icon: 'musical-notes-outline' },
  Sports:    { color: '#16A34A', bg: '#DCFCE7', icon: 'football-outline' },
  Other:     { color: '#475569', bg: '#F1F5F9', icon: 'apps-outline' },
};

export default function MyEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [grouped, setGrouped] = useState<GroupedEvents[]>([]);

  const approved = events.filter((e) => e.status === 'approved').length;
  const pending  = events.filter((e) => e.status === 'pending').length;
  const rejected = events.filter((e) => e.status === 'rejected').length;

  useFocusEffect(
    useCallback(() => {
      if (!auth.currentUser) { router.replace('/login'); return; }
      setLoading(true);
      fetchMyEvents()
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
        <Text style={styles.loadingText}>Loading your events...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO */}
      <LinearGradient colors={Gradients.light.sunrise} style={styles.heroPanel}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back-outline" size={20} color={Colors.light.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="calendar-outline" size={22} color="white" />
          </View>
          <View>
            <Text style={styles.eyebrow}>Organizer dashboard</Text>
            <Text style={styles.heading}>My Events</Text>
          </View>
        </View>

        <Text style={styles.heroSub}>
          All events you've submitted — track approvals, registrations, and edits.
        </Text>

        {/* Stats */}
        {events.length > 0 && (
          <View style={styles.statsRow}>
            <StatChip label="Approved" value={approved} color="#16A34A" />
            <StatChip label="Pending"  value={pending}  color="#B45309" />
            <StatChip label="Rejected" value={rejected} color="#DC2626" />
          </View>
        )}
      </LinearGradient>

      {/* Create button */}
      <TouchableOpacity
        onPress={() => router.push('/create-event')}
        activeOpacity={0.85}
        style={styles.createBtnWrapper}
      >
        <LinearGradient colors={Gradients.light.primary} style={styles.createBtn}>
          <Ionicons name="add-circle-outline" size={18} color="white" />
          <Text style={styles.createBtnText}>Create New Event</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Empty state */}
      {events.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={32} color={Colors.light.primary} />
          </View>
          <Text style={styles.emptyTitle}>No events posted yet</Text>
          <Text style={styles.emptySubtext}>
            Events you create will appear here with their status and registrations.
          </Text>
        </View>
      ) : (
        grouped.map((group) => (
          <View key={group.label} style={styles.group}>
            {/* Month divider */}
            <View style={styles.monthRow}>
              <View style={styles.monthLine} />
              <View style={styles.monthLabelWrap}>
                <Ionicons name="time-outline" size={12} color={Colors.light.textSecondary} />
                <Text style={styles.monthLabel}>{group.label}</Text>
              </View>
              <View style={styles.monthLine} />
            </View>

            {group.events.map((event) => {
              const statusCfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.pending;
              const catMeta   = CATEGORY_META[event.category] ?? CATEGORY_META.Other;
              const regCount  = event.registeredUsers?.length ?? 0;

              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.card}
                  onPress={() => router.push(`/event-details?id=${event.id}`)}
                  activeOpacity={0.85}
                >
                  {/* Thumbnail */}
                  {event.posterUrl ? (
                    <Image source={{ uri: event.posterUrl }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={[catMeta.bg, '#FFFFFF']} style={styles.thumbPlaceholder}>
                      <Ionicons name={catMeta.icon} size={28} color={catMeta.color} />
                    </LinearGradient>
                  )}

                  {/* Card body */}
                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      {/* Category pill */}
                      <View style={[styles.categoryPill, { backgroundColor: catMeta.bg }]}>
                        <Ionicons name={catMeta.icon} size={11} color={catMeta.color} />
                        <Text style={[styles.categoryPillText, { color: catMeta.color }]}>
                          {event.category}
                        </Text>
                      </View>
                      {/* Status badge */}
                      <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Ionicons name={statusCfg.icon} size={11} color={statusCfg.color} />
                        <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                          {statusCfg.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>

                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={12} color={Colors.light.textSecondary} />
                      <Text style={styles.metaText} numberOfLines={1}>{event.venue}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={12} color={Colors.light.textSecondary} />
                      <Text style={styles.metaText} numberOfLines={1}>{event.time}</Text>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={styles.regPill}>
                        <Ionicons name="people-outline" size={13} color="#16A34A" />
                        <Text style={styles.regText}>{regCount} registered</Text>
                        {event.seatLimit != null && (
                          <Text style={styles.seatText}>/ {event.seatLimit}</Text>
                        )}
                      </View>
                      {event.status !== 'rejected' && (
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => router.push(`/create-event?id=${event.id}`)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="pencil-outline" size={14} color={Colors.light.primary} />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
  },

  // HERO
  heroPanel: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backText: {
    color: Colors.light.primary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: 'Sora_700Bold',
    fontSize: 22,
    color: Colors.light.text,
  },
  heroSub: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Sora_400Regular',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
  },
  statLabel: {
    color: Colors.light.textSecondary,
    fontSize: 10,
    fontFamily: 'Sora_600SemiBold',
    marginTop: 2,
  },

  // CREATE BUTTON
  createBtnWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 18,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
  },
  createBtnText: {
    color: 'white',
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
  },

  // EMPTY
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: Colors.light.text,
    fontFamily: 'Sora_700Bold',
    fontSize: 17,
  },
  emptySubtext: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // MONTH GROUP
  group: { marginBottom: 6 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 6,
  },
  monthLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  monthLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  monthLabel: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // EVENT CARD
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  thumb: {
    width: 88,
    height: '100%',
  },
  thumbPlaceholder: {
    width: 88,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 110,
  },
  cardBody: {
    flex: 1,
    padding: 12,
    gap: 5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 10,
    fontFamily: 'Sora_700Bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Sora_700Bold',
  },
  cardTitle: {
    color: Colors.light.text,
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  regPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  regText: {
    color: '#16A34A',
    fontFamily: 'Sora_700Bold',
    fontSize: 11,
  },
  seatText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: {
    color: Colors.light.primary,
    fontFamily: 'Sora_700Bold',
    fontSize: 11,
  },
});