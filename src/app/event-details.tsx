// app/event-details.tsx

import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Event, fetchEventById, markInterest } from '../firebase/eventService';
import { auth, db } from '../firebase/firebaseConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 380;

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  year?: string;
  college?: string;
};

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showStudents, setShowStudents] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const currentUid = auth.currentUser?.uid;

  // Parallax: poster scrolls at half speed
  const posterTranslateY = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [HERO_HEIGHT / 2, 0, -HERO_HEIGHT / 2],
    extrapolate: 'clamp',
  });

  // Top bar fades in as user scrolls into content
  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 80, HERO_HEIGHT - 20],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const evt = await fetchEventById(id);
      setEvent(evt);

      if (evt && currentUid && evt.createdBy === currentUid) {
        const userSnap = await getDoc(doc(db, 'users', currentUid));
        if (
          userSnap.exists() &&
          userSnap.data().role === 'organizer' &&
          userSnap.data().status === 'approved'
        ) {
          setIsOrganizer(true);
        }
      }

      setLoading(false);
    };
    load();
  }, [id]);

  const isRegistered = event?.registeredUsers?.includes(currentUid ?? '') ?? false;
  const count = event?.registeredUsers?.length ?? 0;
  const seatLimit = event?.seatLimit ?? null;
  const isFull = seatLimit !== null && count >= seatLimit;

  const handleRegister = async () => {
    if (!currentUid) {
      Alert.alert('Login required', 'Please log in to register for this event.');
      return;
    }
    if (isFull) {
      Alert.alert('Event Full', 'Sorry, this event has reached its seat limit.');
      return;
    }
    setActionLoading(true);
    try {
      if (!isRegistered) {
        await markInterest(id!);
        const updated = await fetchEventById(id!);
        setEvent(updated);
      }
      if (event?.registerLink) {
        Linking.openURL(event.registerLink).catch(() =>
          Alert.alert('Error', 'Could not open the registration link.')
        );
      } else {
        Alert.alert('✅ Registered!', 'You have been registered. The organizer will share further details soon.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const loadRegisteredStudents = async () => {
    if (!event?.registeredUsers?.length) return;
    setLoadingUsers(true);
    try {
      const profiles: UserProfile[] = [];
      for (const uid of event.registeredUsers) {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          profiles.push({ id: snap.id, ...(snap.data() as Omit<UserProfile, 'id'>) });
        }
      }
      setRegisteredUsers(profiles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleStudents = async () => {
    if (!showStudents && registeredUsers.length === 0) {
      await loadRegisteredStudents();
    }
    setShowStudents((prev) => !prev);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Event not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Floating top bar (appears on scroll) ── */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.floatingHeaderBtn}>
          <Text style={styles.floatingHeaderBtnText}>← Back</Text>
        </TouchableOpacity>
        {isOrganizer && (
          <TouchableOpacity
            style={styles.floatingHeaderBtn}
            onPress={() => router.push(`/create-event?id=${event.id}`)}
          >
            <Text style={styles.floatingHeaderBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* ── Hero Section ── */}
        <View style={styles.heroContainer}>
          {/* Parallax poster */}
          <Animated.View
            style={[
              styles.posterWrapper,
              { transform: [{ translateY: posterTranslateY }] },
            ]}
          >
            {event.posterUrl ? (
              <Image
                source={{ uri: event.posterUrl }}
                style={styles.posterImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.posterPlaceholder}>
                <Text style={styles.posterPlaceholderText}>🎉</Text>
              </View>
            )}
          </Animated.View>

          {/* Gradient fade at the bottom of the hero */}
          <LinearGradient
            colors={['transparent', 'rgba(18,18,18,0.6)', '#121212']}
            locations={[0.4, 0.75, 1]}
            style={styles.heroGradient}
          />

          {/* Floating Back + Edit buttons ON the poster */}
          <View style={styles.heroButtons}>
            <TouchableOpacity style={styles.heroPillBtn} onPress={() => router.back()}>
              <Text style={styles.heroPillBtnText}>← Back</Text>
            </TouchableOpacity>
            {isOrganizer && (
              <TouchableOpacity
                style={styles.heroPillBtn}
                onPress={() => router.push(`/create-event?id=${event.id}`)}
              >
                <Text style={styles.heroPillBtnText}>✏️ Edit Event</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Category badge + Title sit at the bottom of the hero */}
          <View style={styles.heroTextBlock}>
            {event.category && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{event.category}</Text>
              </View>
            )}
            <Text style={styles.title}>{event.title}</Text>
          </View>
        </View>

        {/* ── Content below hero ── */}
        <View style={styles.content}>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <InfoRow icon="📍" label="Venue" value={event.venue} />
            <InfoRow icon="🕒" label="Date & Time" value={event.time} />
            <InfoRow icon="🏷" label="Organised by" value={event.club} />
            {event.deadline && (
              <InfoRow icon="⏰" label="Registration Deadline" value={event.deadline} />
            )}
          </View>

          {/* Seat count card */}
          <View style={styles.countCard}>
            <Text style={styles.countNumber}>{count}</Text>
            <Text style={styles.countLabel}>
              student{count !== 1 ? 's' : ''} registered
            </Text>
            {seatLimit !== null && (
              <View style={[styles.seatBadge, isFull && styles.seatBadgeFull]}>
                <Text style={[styles.seatBadgeText, isFull && styles.seatBadgeTextFull]}>
                  {isFull
                    ? '🔴 Full'
                    : `🟢 ${seatLimit - count} seat${seatLimit - count !== 1 ? 's' : ''} left`}
                </Text>
              </View>
            )}
          </View>

          {/* Organizer: registered students */}
          {isOrganizer && (
            <View style={styles.organizerSection}>
              <TouchableOpacity style={styles.studentsToggle} onPress={toggleStudents}>
                <Text style={styles.studentsToggleText}>
                  👥 {count} Registered Student{count !== 1 ? 's' : ''}
                  {count > 0 ? (showStudents ? '  ▲ Hide' : '  ▼ View All') : ''}
                </Text>
              </TouchableOpacity>

              {showStudents && (
                <View style={styles.studentsList}>
                  {loadingUsers ? (
                    <ActivityIndicator color="#4f46e5" style={{ marginTop: 10 }} />
                  ) : registeredUsers.length === 0 ? (
                    <Text style={styles.noStudents}>No students have registered yet.</Text>
                  ) : (
                    registeredUsers.map((u) => (
                      <View key={u.id} style={styles.studentCard}>
                        <View style={styles.studentRow}>
                          <View style={styles.studentAvatar}>
                            <Text style={styles.avatarText}>{u.name?.[0]?.toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{u.name}</Text>
                            <Text style={styles.studentDetail}>✉️ {u.email}</Text>
                            {u.phone
                              ? <Text style={styles.studentDetail}>📞 {u.phone}</Text>
                              : <Text style={styles.studentDetailMissing}>📞 Phone not provided</Text>
                            }
                            {u.department && <Text style={styles.studentDetail}>📚 {u.department}</Text>}
                            {u.year
                              ? <Text style={styles.studentDetail}>📅 {u.year}</Text>
                              : <Text style={styles.studentDetailMissing}>📅 Year not provided</Text>
                            }
                            {u.college && <Text style={styles.studentDetail}>🏫 {u.college}</Text>}
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          {/* Description */}
          <Text style={styles.sectionHeading}>About this Event</Text>
          <Text style={styles.description}>
            {event.description?.trim() ? event.description : 'No description provided yet.'}
          </Text>

          {/* Register CTA */}
          {isRegistered ? (
            <View style={styles.registeredBadge}>
              <Text style={styles.registeredBadgeText}>✅ You're Registered</Text>
            </View>
          ) : isFull ? (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>🔴 Registrations Closed — Event Full</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.registerButtonText}>Register Now →</Text>
              }
            </TouchableOpacity>
          )}

          {!event.registerLink && !isRegistered && !isFull && (
            <Text style={styles.noLinkNote}>
              * No external form — tapping Register marks your interest directly.
            </Text>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centered: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'white', fontSize: 18, marginBottom: 12 },
  backLink: { color: '#4f46e5', fontSize: 15 },

  // ── Floating header (scrolled state) ──────────────────────────────────────
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#121212',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2a',
  },
  floatingHeaderBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  floatingHeaderBtnText: { color: '#4f46e5', fontSize: 15, fontWeight: '600' },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroContainer: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    position: 'relative',
  },
  posterWrapper: {
    position: 'absolute',
    top: -40,           // extra so parallax has room to move
    left: 0,
    right: 0,
    bottom: -40,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: { fontSize: 64 },

  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.75,
  },

  // Floating Back / Edit pills sitting on the poster
  heroButtons: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  heroPillBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backdropFilter: 'blur(8px)',  // works on iOS; no-op on Android (still looks good)
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroPillBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },

  // Category badge + title at the base of the hero
  heroTextBlock: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  badge: {
    backgroundColor: 'rgba(79,70,229,0.85)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 10,
  },
  badgeText: { color: '#e0e7ff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // ── Scrollable content ────────────────────────────────────────────────────
  content: { paddingHorizontal: 20, paddingTop: 20 },

  infoCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoIcon: { fontSize: 22 },
  infoLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: { color: 'white', fontSize: 15, fontWeight: '500', marginTop: 2 },

  countCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  countNumber: { color: '#818cf8', fontSize: 48, fontWeight: 'bold' },
  countLabel: { color: '#a5b4fc', fontSize: 15, marginTop: 4 },
  seatBadge: {
    marginTop: 10,
    backgroundColor: '#052e16',
    borderWidth: 1,
    borderColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  seatBadgeFull: { backgroundColor: '#2a0a0a', borderColor: '#ef4444' },
  seatBadgeText: { color: '#22c55e', fontWeight: '700', fontSize: 13 },
  seatBadgeTextFull: { color: '#ef4444' },

  organizerSection: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  studentsToggle: { flexDirection: 'row', alignItems: 'center' },
  studentsToggleText: { color: '#4f46e5', fontWeight: '700', fontSize: 15 },
  studentsList: { marginTop: 14, gap: 10 },
  noStudents: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 8 },
  studentCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14 },
  studentRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  studentName: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  studentDetail: { color: '#aaa', fontSize: 13, marginBottom: 2 },
  studentDetailMissing: { color: '#555', fontSize: 13, marginBottom: 2, fontStyle: 'italic' },

  sectionHeading: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  description: { color: '#cccccc', fontSize: 15, lineHeight: 24, marginBottom: 28 },

  registerButton: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  registerButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  registeredBadge: {
    backgroundColor: '#052e16',
    borderWidth: 1.5,
    borderColor: '#22c55e',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  registeredBadgeText: { color: '#22c55e', fontSize: 16, fontWeight: 'bold' },
  fullBadge: {
    backgroundColor: '#2a0a0a',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  fullBadgeText: { color: '#ef4444', fontSize: 15, fontWeight: 'bold' },
  noLinkNote: { color: '#555', fontSize: 12, textAlign: 'center' },
});