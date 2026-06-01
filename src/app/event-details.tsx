// app/event-details.tsx

import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { arrayUnion, deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  Event,
  fetchEventById,
  isDeadlineWithin12Hours,
  unmarkInterest,
} from '../firebase/eventService';
import { auth, db } from '../firebase/firebaseConfig';
import {
  sendNotificationToUser,
} from '../firebase/notificationService';

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

// Helper to safely convert any value to a display string
const toDisplayString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  // Firestore Timestamp
  if (value?.toDate && typeof value.toDate === 'function') {
    return value.toDate().toLocaleString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  return String(value);
};

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [interestLoading, setInterestLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [unregLoading, setUnregLoading] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [hasMarkedInterest, setHasMarkedInterest] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const currentUid = auth.currentUser?.uid;

  const posterTranslateY = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [HERO_HEIGHT / 2, 0, -HERO_HEIGHT / 2],
    extrapolate: 'clamp',
  });

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

      if (evt && currentUid) {
        if (evt.createdBy === currentUid) {
          const userSnap = await getDoc(doc(db, 'users', currentUid));
          if (
            userSnap.exists() &&
            userSnap.data().role === 'organizer' &&
            userSnap.data().status === 'approved'
          ) {
            setIsOrganizer(true);
          }
        }
        if (evt.interestedUsers?.includes(currentUid)) {
          setHasMarkedInterest(true);
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const isRegistered = event?.registeredUsers?.includes(currentUid ?? '') ?? false;
  const isInterested = event?.interestedUsers?.includes(currentUid ?? '') ?? false;

  const count = event?.registeredUsers?.length ?? 0;
  const seatLimit = event?.seatLimit ?? null;
  const isFull = seatLimit !== null && count >= seatLimit;

  const deadlinePassed = event?.deadline
    ? new Date(toDisplayString(event.deadline)) < new Date()
    : false;
  const deadlineSoon = event?.deadline
    ? isDeadlineWithin12Hours(toDisplayString(event.deadline))
    : false;

  // ── MARK INTEREST ────────────────────────────────────────────────────────────
  const handleMarkInterest = async () => {
    if (!currentUid) {
      Alert.alert('Login required', 'Please log in first.');
      return;
    }
    setInterestLoading(true);
    try {
      await updateDoc(doc(db, 'events', id!), {
        interestedUsers: arrayUnion(currentUid),
      });

      setHasMarkedInterest(true);
      const updated = await fetchEventById(id!);
      setEvent(updated);

      if (event?.deadline && isDeadlineWithin12Hours(toDisplayString(event.deadline))) {
        await sendNotificationToUser(
          currentUid,
          `⏰ Deadline Soon: ${event.title}`,
          `You marked interest in "${event.title}". Registration closes in less than 12 hours: ${toDisplayString(event.deadline)}. Register now!`,
          { type: 'deadline_reminder', eventId: id! }
        );
        Alert.alert(
          '⭐ Interest Marked!',
          `You've marked your interest. ⚠️ Deadline is within 12 hours! Register soon.`
        );
      } else {
        Alert.alert(
          '⭐ Interest Marked!',
          `You've marked your interest in "${event?.title}". You'll be reminded 12 hours before the deadline.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setInterestLoading(false);
    }
  };

  // ── REGISTER NOW ─────────────────────────────────────────────────────────────
  const handleRegisterNow = async () => {
    if (!currentUid) {
      Alert.alert('Login required', 'Please log in first.');
      return;
    }
    if (isFull) {
      Alert.alert('Event Full', 'Sorry, this event has reached its seat limit.');
      return;
    }
    setRegisterLoading(true);
    try {
      const fresh = await fetchEventById(id!);
      const freshCount = fresh?.registeredUsers?.length ?? 0;
      const freshLimit = fresh?.seatLimit ?? null;
      if (freshLimit !== null && freshCount >= freshLimit) {
        Alert.alert('Event Full', 'Sorry, no seats left.');
        setRegisterLoading(false);
        return;
      }

      await updateDoc(doc(db, 'events', id!), {
        registeredUsers: arrayUnion(currentUid),
      });

      const updated = await fetchEventById(id!);
      setEvent(updated);

      await sendNotificationToUser(
        currentUid,
        `✅ Registered: ${event?.title}`,
        `You've successfully registered for "${event?.title}".${event?.deadline ? ` Deadline: ${toDisplayString(event.deadline)}` : ''}`,
        { type: 'registration_confirmed', eventId: id! }
      );

      if (event?.deadline) {
        await sendNotificationToUser(
          currentUid,
          `⏰ Deadline Reminder: ${event.title}`,
          `Don't miss the registration deadline: ${toDisplayString(event.deadline)}. Make sure you've completed all steps!`,
          { type: 'deadline_reminder', eventId: id! }
        );
      }

      if (event?.registerLink) {
        Linking.openURL(event.registerLink).catch(() =>
          Alert.alert('Error', 'Could not open the registration link.')
        );
      } else {
        Alert.alert(
          '✅ Registered!',
          `You're now registered for "${event?.title}". The organizer will share further details soon.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  // ── UNREGISTER ───────────────────────────────────────────────────────────────
  const handleUnmarkInterest = async () => {
    Alert.alert(
      'Remove Registration',
      'Are you sure you want to remove your registration for this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUnregLoading(true);
            try {
              await unmarkInterest(id!);
              const updated = await fetchEventById(id!);
              setEvent(updated);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setUnregLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── DELETE EVENT ─────────────────────────────────────────────────────────────
  const handleDeleteEvent = async () => {
    const eventId = Array.isArray(id) ? id[0] : id;

    if (!eventId) {
      Alert.alert('Error', 'Event ID not found.');
      return;
    }

    try {
      if (isAdmin) {
        await deleteDoc(doc(db, 'events', eventId));
        Alert.alert('Deleted', 'Event permanently deleted.');
      } else {
        await updateDoc(doc(db, 'events', eventId), {
          status: 'deleted',
          deletedAt: serverTimestamp(),
        });
        Alert.alert('Removed', 'Event removed successfully.');
      }
      router.replace('/my-events');
    } catch (err: any) {
      console.log('DELETE ERROR:', err);
      Alert.alert('Delete Failed', err.message);
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

  const formatDateTime = (dateTime: any): string => {
    if (!dateTime) return 'TBA';
    try {
      // Handle Firestore Timestamp
      const date =
        dateTime?.toDate && typeof dateTime.toDate === 'function'
          ? dateTime.toDate()
          : new Date(dateTime);

      if (isNaN(date.getTime())) return String(dateTime);

      return date.toLocaleString([], {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateTime);
    }
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
          <Text style={styles.backLink}>{'← Go back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const deadlineDisplay = event.deadline ? toDisplayString(event.deadline) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Floating top bar */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.floatingHeaderBtn}>
          <Text style={styles.floatingHeaderBtnText}>{'← Back'}</Text>
        </TouchableOpacity>
        {isOrganizer && (
          <TouchableOpacity
            style={styles.floatingHeaderBtn}
            onPress={() => router.push(`/create-event?id=${event.id}`)}
          >
            <Text style={styles.floatingHeaderBtnText}>{'✏️ Edit'}</Text>
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
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Animated.View
            style={[styles.posterWrapper, { transform: [{ translateY: posterTranslateY }] }]}
          >
            {event.posterUrl ? (
              <Image source={{ uri: event.posterUrl }} style={styles.posterImage} resizeMode="cover" />
            ) : (
              <View style={styles.posterPlaceholder}>
                <Text style={styles.posterPlaceholderText}>{'🎉'}</Text>
              </View>
            )}
          </Animated.View>

          <LinearGradient
            colors={['transparent', 'rgba(18,18,18,0.6)', '#121212']}
            locations={[0.4, 0.75, 1]}
            style={styles.heroGradient}
          />

          <View style={styles.heroButtons}>
            <TouchableOpacity style={styles.heroPillBtn} onPress={() => router.back()}>
              <Text style={styles.heroPillBtnText}>{'← Back'}</Text>
            </TouchableOpacity>
            {isOrganizer && (
              <TouchableOpacity
                style={styles.heroPillBtn}
                onPress={() => router.push(`/create-event?id=${event.id}`)}
              >
                <Text style={styles.heroPillBtnText}>{'✏️ Edit Event'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroTextBlock}>
            {event.category ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{event.category}</Text>
              </View>
            ) : null}
            <Text style={styles.title}>{event.title}</Text>
          </View>
        </View>

        {/* Content below hero */}
        <View style={styles.content}>

          {/* Deadline warning banner */}
          {deadlineSoon && !isRegistered && deadlineDisplay ? (
            <View style={styles.deadlineBanner}>
              <Text style={styles.deadlineBannerText}>
                {`⏰ Registration closes in less than 12 hours! Deadline: ${deadlineDisplay}`}
              </Text>
            </View>
          ) : null}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <InfoRow icon="📍" label="Venue" value={event.venue ?? 'TBA'} />
            <InfoRow icon="🕒" label="Date & Time" value={formatDateTime(event.time)} />
            <InfoRow icon="🏷" label="Organised by" value={event.club ?? ''} />
            {deadlineDisplay ? (
              <InfoRow icon="⏰" label="Registration Deadline" value={deadlineDisplay} />
            ) : null}
          </View>

          {/* Seat count card */}
          <View style={styles.countCard}>
            <Text style={styles.countNumber}>{count}</Text>
            <Text style={styles.countLabel}>
              {`student${count !== 1 ? 's' : ''} registered`}
            </Text>
            {seatLimit !== null ? (
              <View style={[styles.seatBadge, isFull && styles.seatBadgeFull]}>
                <Text style={[styles.seatBadgeText, isFull && styles.seatBadgeTextFull]}>
                  {isFull
                    ? '🔴 Full'
                    : `🟢 ${seatLimit - count} seat${seatLimit - count !== 1 ? 's' : ''} left`}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Organizer: registered students */}
          {isOrganizer ? (
            <View style={styles.organizerSection}>
              <TouchableOpacity style={styles.studentsToggle} onPress={toggleStudents}>
                <Text style={styles.studentsToggleText}>
                  {`👥 ${count} Registered Student${count !== 1 ? 's' : ''}${count > 0 ? (showStudents ? '  ▲ Hide' : '  ▼ View All') : ''}`}
                </Text>
              </TouchableOpacity>

              {showStudents ? (
                <View style={styles.studentsList}>
                  {loadingUsers ? (
                    <ActivityIndicator color="#4f46e5" style={{ marginTop: 10 }} />
                  ) : registeredUsers.length === 0 ? (
                    <Text style={styles.noStudents}>{'No students have registered yet.'}</Text>
                  ) : (
                    registeredUsers.map((u) => (
                      <View key={u.id} style={styles.studentCard}>
                        <View style={styles.studentRow}>
                          <View style={styles.studentAvatar}>
                            <Text style={styles.avatarText}>{u.name?.[0]?.toUpperCase() ?? '?'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{u.name}</Text>
                            <Text style={styles.studentDetail}>{`✉️ ${u.email}`}</Text>
                            {u.phone
                              ? <Text style={styles.studentDetail}>{`📞 ${u.phone}`}</Text>
                              : <Text style={styles.studentDetailMissing}>{'📞 Phone not provided'}</Text>
                            }
                            {u.department
                              ? <Text style={styles.studentDetail}>{`📚 ${u.department}`}</Text>
                              : null}
                            {u.year
                              ? <Text style={styles.studentDetail}>{`📅 ${u.year}`}</Text>
                              : <Text style={styles.studentDetailMissing}>{'📅 Year not provided'}</Text>
                            }
                            {u.college
                              ? <Text style={styles.studentDetail}>{`🏫 ${u.college}`}</Text>
                              : null}
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              ) : null}

              {/* Delete Event button */}
              <TouchableOpacity style={styles.deleteEventBtn} onPress={handleDeleteEvent}>
                <Text style={styles.deleteEventBtnText}>{'🗑 Delete Event'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Description */}
          <Text style={styles.sectionHeading}>{'About this Event'}</Text>
          <Text style={styles.description}>
            {event.description?.trim() ? event.description : 'No description provided yet.'}
          </Text>

          {/* ── CTA Section ── */}
          {isRegistered ? (
            <View>
              <View style={styles.registeredBadge}>
                <Text style={styles.registeredBadgeText}>{"✅ You're Registered"}</Text>
              </View>
              <TouchableOpacity
                style={styles.unregisterButton}
                onPress={handleUnmarkInterest}
                disabled={unregLoading}
              >
                {unregLoading
                  ? <ActivityIndicator color="#ef4444" />
                  : <Text style={styles.unregisterButtonText}>{'✕ Remove Registration'}</Text>
                }
              </TouchableOpacity>
            </View>
          ) : deadlinePassed ? (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>{'⛔ Registration Deadline Passed'}</Text>
            </View>
          ) : isFull ? (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>{'🔴 Registrations Closed — Event Full'}</Text>
            </View>
          ) : (
            <View style={styles.ctaContainer}>
              {!isInterested ? (
                <TouchableOpacity
                  style={[
                    styles.interestButton,
                    deadlineSoon && styles.interestButtonUrgent,
                  ]}
                  onPress={handleMarkInterest}
                  disabled={interestLoading}
                >
                  {interestLoading
                    ? <ActivityIndicator color="white" />
                    : (
                      <View style={styles.btnInner}>
                        <Text style={styles.interestButtonText}>
                          {deadlineSoon ? '⚡ Mark Interest — Closing Soon!' : '⭐ Mark Interest'}
                        </Text>
                        <Text style={styles.interestButtonSub}>
                          {deadlineSoon
                            ? 'You will get an immediate deadline alert'
                            : 'Get a reminder 12h before deadline'}
                        </Text>
                      </View>
                    )
                  }
                </TouchableOpacity>
              ) : (
                <View style={styles.interestedBadge}>
                  <Text style={styles.interestedBadgeText}>{'⭐ Interest Marked'}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  deadlineSoon && styles.registerButtonUrgent,
                ]}
                onPress={handleRegisterNow}
                disabled={registerLoading}
              >
                {registerLoading
                  ? <ActivityIndicator color="white" />
                  : (
                    <View style={styles.btnInner}>
                      <Text style={styles.registerButtonText}>
                        {deadlineSoon ? '🔥 Register Now — Closing Soon!' : 'Register Now →'}
                      </Text>
                      <Text style={styles.registerButtonSub}>
                        {'Instant confirmation + deadline reminder'}
                      </Text>
                    </View>
                  )
                }
              </TouchableOpacity>

              {!event.registerLink ? (
                <Text style={styles.noLinkNote}>
                  {'* Registering adds you to the event directly in the app.'}
                </Text>
              ) : null}
            </View>
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

  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#121212',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2a2a2a',
  },
  floatingHeaderBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  floatingHeaderBtnText: { color: '#4f46e5', fontSize: 15, fontWeight: '600' },

  heroContainer: {
    height: HERO_HEIGHT, width: SCREEN_WIDTH, overflow: 'hidden', position: 'relative',
  },
  posterWrapper: { position: 'absolute', top: -40, left: 0, right: 0, bottom: -40 },
  posterImage: { width: '100%', height: '100%' },
  posterPlaceholder: {
    flex: 1, backgroundColor: '#1e1b4b', justifyContent: 'center', alignItems: 'center',
  },
  posterPlaceholderText: { fontSize: 64 },
  heroGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: HERO_HEIGHT * 0.75,
  },
  heroButtons: {
    position: 'absolute', top: 52, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', zIndex: 10,
  },
  heroPillBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  heroPillBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  heroTextBlock: { position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 10 },
  badge: {
    backgroundColor: 'rgba(79,70,229,0.85)', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginBottom: 10,
  },
  badgeText: { color: '#e0e7ff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    color: 'white', fontSize: 26, fontWeight: 'bold', lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },

  content: { paddingHorizontal: 20, paddingTop: 20 },

  deadlineBanner: {
    backgroundColor: '#2a1500',
    borderWidth: 1,
    borderColor: '#f97316',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  deadlineBannerText: { color: '#f97316', fontSize: 13, fontWeight: '600', lineHeight: 20 },

  infoCard: {
    backgroundColor: '#1e1e1e', borderRadius: 16, padding: 20, marginBottom: 20, gap: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoIcon: { fontSize: 22 },
  infoLabel: {
    color: '#888', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6,
  },
  infoValue: { color: 'white', fontSize: 15, fontWeight: '500', marginTop: 2 },

  countCard: {
    backgroundColor: '#1e1b4b', borderRadius: 16, padding: 20, alignItems: 'center',
    marginBottom: 24, borderWidth: 1, borderColor: '#4f46e5',
  },
  countNumber: { color: '#818cf8', fontSize: 48, fontWeight: 'bold' },
  countLabel: { color: '#a5b4fc', fontSize: 15, marginTop: 4 },
  seatBadge: {
    marginTop: 10, backgroundColor: '#052e16', borderWidth: 1, borderColor: '#22c55e',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  seatBadgeFull: { backgroundColor: '#2a0a0a', borderColor: '#ef4444' },
  seatBadgeText: { color: '#22c55e', fontWeight: '700', fontSize: 13 },
  seatBadgeTextFull: { color: '#ef4444' },

  organizerSection: {
    backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16, marginBottom: 24,
  },
  studentsToggle: { flexDirection: 'row', alignItems: 'center' },
  studentsToggleText: { color: '#4f46e5', fontWeight: '700', fontSize: 15 },
  studentsList: { marginTop: 14, gap: 10 },
  noStudents: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 8 },
  studentCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14 },
  studentRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  studentAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#22c55e',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  studentName: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  studentDetail: { color: '#aaa', fontSize: 13, marginBottom: 2 },
  studentDetailMissing: { color: '#555', fontSize: 13, marginBottom: 2, fontStyle: 'italic' },

  sectionHeading: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  description: { color: '#cccccc', fontSize: 15, lineHeight: 24, marginBottom: 28 },

  ctaContainer: { gap: 12, marginBottom: 10 },
  btnInner: { alignItems: 'center', gap: 3 },

  interestButton: {
    backgroundColor: '#1e1b4b',
    borderWidth: 1.5,
    borderColor: '#4f46e5',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  interestButtonUrgent: {
    backgroundColor: '#2a1500',
    borderColor: '#f97316',
  },
  interestButtonText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  interestButtonSub: { color: '#888', fontSize: 11, marginTop: 2 },

  interestedBadge: {
    backgroundColor: '#1e1b4b', borderWidth: 1.5, borderColor: '#4f46e5',
    padding: 14, borderRadius: 14, alignItems: 'center',
  },
  interestedBadgeText: { color: '#818cf8', fontSize: 15, fontWeight: 'bold' },

  registerButton: {
    backgroundColor: '#22c55e', padding: 16, borderRadius: 14, alignItems: 'center',
  },
  registerButtonUrgent: { backgroundColor: '#f97316' },
  registerButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  registerButtonSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },

  registeredBadge: {
    backgroundColor: '#052e16', borderWidth: 1.5, borderColor: '#22c55e',
    padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10,
  },
  registeredBadgeText: { color: '#22c55e', fontSize: 16, fontWeight: 'bold' },

  unregisterButton: {
    borderWidth: 1, borderColor: '#ef4444', padding: 12,
    borderRadius: 12, alignItems: 'center', marginBottom: 10,
  },
  unregisterButtonText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },

  fullBadge: {
    backgroundColor: '#2a0a0a', borderWidth: 1.5, borderColor: '#ef4444',
    padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10,
  },
  fullBadgeText: { color: '#ef4444', fontSize: 15, fontWeight: 'bold' },
  noLinkNote: { color: '#555', fontSize: 12, textAlign: 'center' },

  deleteEventBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2a0a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  deleteEventBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
});