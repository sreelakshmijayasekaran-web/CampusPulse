import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Event, fetchEvents } from '../firebase/eventService';
import { sendEventTimeReminderToRegistered } from '../firebase/notificationService';
import { auth, db } from '../firebase/firebaseConfig';
import { Colors, Gradients } from '../constants/theme';

const CATEGORIES = ['All', 'Hackathon', 'Workshop', 'Seminar', 'Cultural', 'Sports', 'Other'];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  All: { bg: '#DBEAFE', text: '#1D4ED8', icon: 'sparkles-outline' },
  Hackathon: { bg: '#E0F2FE', text: '#0369A1', icon: 'code-slash-outline' },
  Workshop: { bg: '#DCFCE7', text: '#15803D', icon: 'construct-outline' },
  Seminar: { bg: '#FEF3C7', text: '#B45309', icon: 'mic-outline' },
  Cultural: { bg: '#FFE4E6', text: '#BE123C', icon: 'musical-notes-outline' },
  Sports: { bg: '#F3E8FF', text: '#7E22CE', icon: 'football-outline' },
  Other: { bg: '#F1F5F9', text: '#475569', icon: 'apps-outline' },
};

// ── Event-time reminder check ──────────────────────────────────────────────
// For each approved event with registered users, check if event.time falls
// within the 12h or 3h reminder window. If so (and not already notified),
// notify all registeredUsers and mark the event so it isn't sent again.
async function checkAndSendEventTimeReminders(events: Event[]) {
  const now = Date.now();

  for (const event of events) {
    if (!event.time || !event.registeredUsers?.length) continue;

    const eventTime = new Date(event.time).getTime();
    if (isNaN(eventTime)) continue;

    const hoursLeft = (eventTime - now) / (1000 * 60 * 60);

    // 12-hour window: event is at most 12h away (and hasn't started yet)
    if (hoursLeft <= 12 && hoursLeft > 0 && !(event as any).notified12h) {
      try {
        await sendEventTimeReminderToRegistered(
          event.id,
          event.title,
          event.registeredUsers,
          12,
          event.time
        );
        await updateDoc(doc(db, 'events', event.id), { notified12h: true });
      } catch (err) {
        console.error('Failed to send 12h reminder for event', event.id, err);
      }
    }

    // 3-hour window: event is at most 3h away (and hasn't started yet)
    if (hoursLeft <= 3 && hoursLeft > 0 && !(event as any).notified3h) {
      try {
        await sendEventTimeReminderToRegistered(
          event.id,
          event.title,
          event.registeredUsers,
          3,
          event.time
        );
        await updateDoc(doc(db, 'events', event.id), { notified3h: true });
      } catch (err) {
        console.error('Failed to send 3h reminder for event', event.id, err);
      }
    }
  }
}

export default function HomeScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
          setUserStatus(userDoc.data().status);
          setUserName(userDoc.data().name);
        }
      } else {
        setRole(null);
        setUserStatus(null);
        setUserName(null);
        setUnreadCount(0);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', auth.currentUser.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size));
    return unsub;
  }, [user]);

  useEffect(() => {
    fetchEvents()
      .then((fetched) => {
        setEvents(fetched);
        // Fire-and-forget: check for events whose start time is 12h/3h away
        // and notify registered users (in-app notification doc).
        checkAndSendEventTimeReminders(fetched).catch(console.error);
      })
      .catch(console.error)
      .finally(() => setLoadingEvents(false));
  }, []);

  const filteredEvents = events.filter((event) => {
    const value = search.toLowerCase();
    const matchesSearch =
      event.title.toLowerCase().includes(value) ||
      event.venue.toLowerCase().includes(value) ||
      event.club.toLowerCase().includes(value);
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const now = new Date();
  const happeningToday = filteredEvents.filter((event) => {
    if (!event.time) return false;
    return new Date(event.time).toDateString() === now.toDateString();
  });
  const upcomingEvents = filteredEvents.filter((event) => {
    if (!event.time?.includes('T')) return false;
    return new Date(event.time) > now;
  });
  const recentlyHappened = filteredEvents.filter((event) => {
    if (!event.time?.includes('T')) return false;
    return new Date(event.time) < now;
  });
  const trendingEvents = [...filteredEvents].sort(
    (a, b) => (b.registeredUsers?.length || 0) - (a.registeredUsers?.length || 0)
  );

  const firstName = userName?.split(' ')[0] ?? 'there';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={Gradients.light.sunrise} style={styles.heroPanel}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.light.primary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {user ? (
            <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')} activeOpacity={0.85}>
              <Ionicons name="person-circle-outline" size={34} color={Colors.light.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.authRow}>
              <Link href="/login" asChild>
                <TouchableOpacity style={styles.loginButton} activeOpacity={0.85}>
                  <Text style={styles.loginButtonText}>Log In</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/signup" asChild>
                <TouchableOpacity activeOpacity={0.85}>
                  <LinearGradient colors={Gradients.light.primary} style={styles.signupButton}>
                    <Text style={styles.signupButtonText}>Sign Up</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
            </View>
          )}
        </View>

        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="radio-outline" size={24} color="white" />
          </View>
          <View>
            <Text style={styles.eyebrow}>Campus social feed</Text>
            <Text style={styles.heading}>CampusPulse</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>{user ? `Hey ${firstName}, see what's buzzing.` : "See what's buzzing on campus."}</Text>
        <Text style={styles.heroSub}>Events, clubs, workshops and campus moments in one colorful feed.</Text>

        <View style={styles.statsRow}>
          <StatChip label="Events" value={filteredEvents.length} color="#2563EB" />
          <StatChip label="Today" value={happeningToday.length} color="#16A34A" />
          <StatChip label="Trending" value={trendingEvents.length} color="#F97316" />
        </View>
      </LinearGradient>

      {role === 'organizer' && userStatus === 'approved' && (
        <Link href="/create-event" asChild>
          <TouchableOpacity activeOpacity={0.85}>
            <LinearGradient colors={Gradients.light.campus} style={styles.createButton}>
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text style={styles.createButtonText}>Create Event</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Link>
      )}

      {role === 'admin' && (
        <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin')} activeOpacity={0.85}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.light.primary} />
          <Text style={styles.adminButtonText}>Admin Panel</Text>
        </TouchableOpacity>
      )}

      {role === 'organizer' && userStatus === 'pending' && (
        <View style={styles.pendingNotice}>
          <Ionicons name="time-outline" size={18} color="#B45309" />
          <Text style={styles.pendingText}>Your organizer account is pending admin approval.</Text>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#64748B" />
        <TextInput
          placeholder="Search events, venues, clubs..."
          placeholderTextColor="#8A94A6"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
            <Ionicons name="close-outline" size={18} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          const palette = CATEGORY_STYLES[cat];
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.85}
              style={[
                styles.categoryTag,
                { backgroundColor: palette.bg, borderColor: isActive ? palette.text : 'transparent' },
                isActive && styles.categoryTagActive,
              ]}
            >
              <Ionicons name={palette.icon} size={15} color={palette.text} />
              <Text style={[styles.categoryText, { color: palette.text }]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loadingEvents ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.light.primary} size="large" />
          <Text style={styles.loadingText}>Loading campus buzz...</Text>
        </View>
      ) : (
        <>
          <EventSection title="Happening Today" icon="flash-outline" events={happeningToday} status="LIVE" accent="#16A34A" />
          <EventSection title="Upcoming Events" icon="calendar-outline" events={upcomingEvents} status="UPCOMING" accent="#2563EB" />
          <EventSection title="Trending Now" icon="flame-outline" events={trendingEvents} status="TRENDING" accent="#F97316" />
          <EventSection title="Recently Happened" icon="checkmark-done-outline" events={recentlyHappened} status="ENDED" accent="#64748B" faded />

          {filteredEvents.length === 0 && (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={30} color={Colors.light.primary} />
              </View>
              <Text style={styles.emptyText}>No events found</Text>
              <Text style={styles.emptySubtext}>Try another keyword or category.</Text>
            </View>
          )}
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function EventSection({
  title,
  icon,
  events,
  status,
  accent,
  faded,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  events: Event[];
  status: string;
  accent: string;
  faded?: boolean;
}) {
  if (events.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${accent}18` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={styles.subheading}>{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} status={status} accent={accent} faded={faded} />
        ))}
      </ScrollView>
    </View>
  );
}

function EventCard({ event, status, accent, faded }: { event: Event; status: string; accent: string; faded?: boolean }) {
  const taken = event.registeredUsers?.length ?? 0;
  const category = event.category || 'Other';
  const palette = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other;

const formattedTime = event.time
    ? new Date(event.time).toLocaleString([], {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : null;
  return (
    <TouchableOpacity
      style={[styles.posterCard, faded && styles.fadedCard]}
      onPress={() => router.push(`/event-details?id=${event.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.posterMedia}>
        {event.posterUrl ? (
          <Image source={{ uri: event.posterUrl }} style={styles.posterImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[palette.bg, '#FFFFFF']} style={styles.posterPlaceholder}>
            <Ionicons name={palette.icon} size={40} color={palette.text} />
            <Text style={[styles.posterPlaceholderTitle, { color: palette.text }]} numberOfLines={2}>
              {event.title}
            </Text>
          </LinearGradient>
        )}
        <View style={[styles.posterBadge, { backgroundColor: accent }]}>
          <Text style={styles.posterBadgeText}>{status}</Text>
        </View>
      </View>

      <View style={styles.posterInfo}>
        <View style={[styles.categoryMini, { backgroundColor: palette.bg }]}>
          <Text style={[styles.categoryMiniText, { color: palette.text }]}>{category}</Text>
        </View>
        <Text style={styles.posterTitle} numberOfLines={2}>{event.title}</Text>
        <MetaRow icon="location-outline" text={event.venue} />
        <MetaRow icon="business-outline" text={event.club} />
         {formattedTime && (
          <MetaRow icon="calendar-outline" text={formattedTime} />
        )}
        <View style={styles.cardFooter}>
          <View style={styles.peoplePill}>
            <Ionicons name="people-outline" size={14} color={Colors.light.success} />
            <Text style={styles.posterCount}>{taken}</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={24} color={accent} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={13} color={Colors.light.textSecondary} />
      <Text style={styles.posterSub} numberOfLines={1}>{text}</Text>
    </View>
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
  heroPanel: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconButton: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontFamily: 'Sora_700Bold',
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authRow: {
    flexDirection: 'row',
    gap: 8,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  loginButtonText: {
    color: Colors.light.text,
    fontSize: 12,
    fontFamily: 'Sora_700Bold',
  },
  signupButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Sora_700Bold',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
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
    fontSize: 24,
    color: Colors.light.text,
  },
  heroTitle: {
    color: Colors.light.text,
    fontSize: 27,
    lineHeight: 34,
    fontFamily: 'Sora_700Bold',
    maxWidth: 330,
  },
  heroSub: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Sora_400Regular',
    marginTop: 8,
    maxWidth: 330,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Sora_700Bold',
  },
  statLabel: {
    color: Colors.light.textSecondary,
    fontSize: 10,
    fontFamily: 'Sora_600SemiBold',
    marginTop: 1,
  },
  createButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 14,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  adminButtonText: {
    color: Colors.light.primary,
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  pendingText: {
    color: '#92400E',
    fontFamily: 'Sora_500Medium',
    fontSize: 13,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    paddingVertical: 12,
    marginLeft: 8,
  },
  clearButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    marginBottom: 18,
  },
  categoryContent: {
    gap: 9,
    paddingRight: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  categoryTagActive: {
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 56,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subheading: {
    color: Colors.light.text,
    fontSize: 16,
    fontFamily: 'Sora_700Bold',
  },
  posterRow: {
    paddingRight: 18,
    paddingBottom: 18,
    gap: 14,
  },
  posterCard: {
    width: 214,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F8DED0',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  fadedCard: {
    opacity: 0.72,
  },
  posterMedia: {
    height: 164,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    gap: 10,
  },
  posterPlaceholderTitle: {
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    textAlign: 'center',
    lineHeight: 19,
  },
  posterBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  posterBadgeText: {
    color: 'white',
    fontSize: 9,
    fontFamily: 'Sora_700Bold',
  },
  posterInfo: {
    padding: 14,
    gap: 8,
  },
  categoryMini: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryMiniText: {
    fontSize: 10,
    fontFamily: 'Sora_700Bold',
  },
  posterTitle: {
    color: Colors.light.text,
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
    lineHeight: 20,
    minHeight: 40,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  posterSub: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  peoplePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  posterCount: {
    color: Colors.light.success,
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
  },
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
  emptyText: {
    color: Colors.light.text,
    fontSize: 17,
    fontFamily: 'Sora_700Bold',
    marginBottom: 4,
  },
  emptySubtext: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
  },
});