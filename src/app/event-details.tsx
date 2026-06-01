// app/event-details.tsx

import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';

import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import {
  arrayUnion,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

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
  const [interestLoading, setInterestLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [unregLoading, setUnregLoading] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  // Track which actions the user has taken THIS SESSION (persisted in Firestore via separate fields)
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
        // Check if user is the organizer
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
        // Check if user has already marked interest (in interestedUsers array)
        if (evt.interestedUsers?.includes(currentUid)) {
          setHasMarkedInterest(true);
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  // User is in registeredUsers → fully registered
  const isRegistered = event?.registeredUsers?.includes(currentUid ?? '') ?? false;
  const isPending =
  event?.pendingRegistrations?.includes(currentUid ?? '') ?? false;
  // User is in interestedUsers → marked interest but not yet registered
  const isInterested = event?.interestedUsers?.includes(currentUid ?? '') ?? false;

  const count = event?.registeredUsers?.length ?? 0;
  const seatLimit = event?.seatLimit ?? null;
  const isFull = seatLimit !== null && count >= seatLimit;
  const deadlinePassed =
  event?.deadline
    ? new Date(event.deadline) < new Date()
    : false;
  const deadlineSoon = event?.deadline ? isDeadlineWithin12Hours(event.deadline) : false;
  
  const registrationClosed = event?.registrationClosed ?? false;
  console.log("registrationClosed =", registrationClosed);

  // ── MARK INTEREST ────────────────────────────────────────────────────────────
  // Adds user to interestedUsers[] (NOT registeredUsers)
  // Sends a deadline notification ONLY if deadline is within 12 hours
  const handleMarkInterest = async () => {
    if (!currentUid) {
      Alert.alert('Login required', 'Please log in first.');
      return;
    }
    setInterestLoading(true);
    try {
      // Add to interestedUsers (separate field, not registeredUsers)
      await updateDoc(doc(db, 'events', id!), {
        interestedUsers: arrayUnion(currentUid),
      });

      setHasMarkedInterest(true);
      const updated = await fetchEventById(id!);
      setEvent(updated);
      console.log(updated);

      // Send deadline notification ONLY if deadline is within 12 hours
      if (event?.deadline && isDeadlineWithin12Hours(event.deadline)) {
        await sendNotificationToUser(
          currentUid,
          `⏰ Deadline Soon: ${event.title}`,
          `You marked interest in "${event.title}". Registration closes in less than 12 hours: ${event.deadline}. Register now!`,
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
  // Adds user to registeredUsers[] AND sends confirmation + deadline notification immediately
    const handleRegisterNow = async () => {
    
      if (
  event?.deadline &&
  new Date(event.deadline) < new Date()
) {
  Alert.alert(
    "Registration Closed",
    "The registration deadline has passed."
  );
  return;
}
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
    // Fresh event check
    const fresh = await fetchEventById(id!);

    const freshCount = fresh?.registeredUsers?.length ?? 0;
    const freshLimit = fresh?.seatLimit ?? null;

    if (freshLimit !== null && freshCount >= freshLimit) {
      Alert.alert('Event Full', 'Sorry, no seats left.');
      setRegisterLoading(false);
      return;
    }

    // Get current user details
    const userSnap = await getDoc(doc(db, 'users', currentUid));

    if (!userSnap.exists()) {
      Alert.alert('Error', 'User profile not found.');
      return;
    }

    const userData = userSnap.data();

    // Add user to pending registrations
    await updateDoc(doc(db, 'events', id!), {
      pendingRegistrations: arrayUnion(currentUid),
    });

    // Create prefilled Google Form URL
       const baseUrl = event?.registerLink?.split('?')[0];

const formLink =
  `${baseUrl}?usp=pp_url` +
  `&entry.1686065494=${encodeURIComponent(userData.name || '')}` +
  `&entry.1256362250=${encodeURIComponent(userData.department || '')}` +
  `&entry.1005576141=${encodeURIComponent(userData.email || '')}` +
  `&entry.1281986389=${encodeURIComponent(id!)}` +
  `&entry.1849380601=${encodeURIComponent(currentUid)}`;

    // Open Google Form
    console.log("EVENT:", event);
    console.log("REGISTER LINK:", event?.registerLink);
    console.log("FORM LINK:", formLink);
    console.log("FORM LINK =", formLink);

const supported = await Linking.canOpenURL(formLink);

console.log("CAN OPEN =", supported);

if (!supported) {
  Alert.alert("Cannot open form link");
  return;
}
    await Linking.openURL(formLink);

    Alert.alert(
      'Complete Registration',
      'Please submit the Google Form to complete your registration.'
    );

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
  const handleToggleRegistration = async () => {
  try {
    await updateDoc(doc(db, "events", id!), {
      registrationClosed: !event?.registrationClosed,
    });

    Alert.alert(
      event?.registrationClosed
        ? "Registration Opened"
        : "Registration Closed",
      event?.registrationClosed
        ? "Students can register again."
        : "Students can no longer register."
    );

    const updated = await fetchEventById(id!);
    setEvent(updated);

  } catch (err: any) {
    Alert.alert("Error", err.message);
  }
};
//Deleting the event
    const handleDeleteEvent = async () => {

  const eventId = Array.isArray(id) ? id[0] : id;

  if (!eventId) {
    Alert.alert("Error", "Event ID not found.");
    return;
  }

  try {

    // ── ADMIN → HARD DELETE ──
    if (isAdmin) {

      await deleteDoc(doc(db, "events", eventId));

      Alert.alert(
        "Deleted",
        "Event permanently deleted."
      );
    }

    // ── ORGANIZER → SOFT DELETE ──
    else {

      await updateDoc(doc(db, "events", eventId), {
        status: "deleted",
        deletedAt: serverTimestamp(),
      });

      Alert.alert(
        "Removed",
        "Event removed successfully."
      );
    }

    router.replace("/my-events");

  } catch (err: any) {

    console.log("DELETE ERROR:", err);

    Alert.alert(
      "Delete Failed",
      err.message
    );
  }
  const handleCloseRegistration = async () => {
  try {
    await updateDoc(doc(db, "events", id!), {
      registrationClosed: true,
    });

    setEvent((prev) =>
      prev
        ? {
            ...prev,
            registrationClosed: true,
          }
        : prev
    );

    Alert.alert(
      "Registration Closed",
      "Registrations have been closed successfully."
    );
  } catch (err: any) {
    Alert.alert("Error", err.message);
  }
};
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
  const formatDateTime = (dateTime: string) => {

  if (!dateTime) return "";

  const date = new Date(dateTime);

  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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

      {/* Floating top bar */}
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
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Animated.View
            style={[styles.posterWrapper, { transform: [{ translateY: posterTranslateY }] }]}
          >
            {event.posterUrl ? (
              <Image source={{ uri: event.posterUrl }} style={styles.posterImage} resizeMode="cover" />
            ) : (
              <View style={styles.posterPlaceholder}>
                <Text style={styles.posterPlaceholderText}>🎉</Text>
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

          <View style={styles.heroTextBlock}>
            {event.category && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{event.category}</Text>
              </View>
            )}
            <Text style={styles.title}>{event.title}</Text>
          </View>
        </View>

        {/* Content below hero */}
        <View style={styles.content}>
          

          {/* Deadline warning banner */}
          {deadlineSoon && !isRegistered && (
            <View style={styles.deadlineBanner}>
              <Text style={styles.deadlineBannerText}>
                ⏰ Registration closes in less than 12 hours! Deadline: {event.deadline}
              </Text>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <InfoRow icon="📍" label="Venue" value={event.venue} />
            <InfoRow icon="🕒" label="Date & Time" value={formatDateTime(event.time)}/>
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

              {/* Delete Event button */}
              <TouchableOpacity
  style={styles.closeRegistrationBtn}
  onPress={() => {
    console.log("BUTTON PRESSED");
    Alert.alert("Button Pressed");
    handleToggleRegistration();
  }}
>
  <Text style={styles.closeRegistrationBtnText}>
  {event?.registrationClosed
    ? "✅ Open Registration"
    : "🚫 Close Registration"}
</Text>
</TouchableOpacity>

{/* Delete Event button */}
<TouchableOpacity style={styles.deleteEventBtn} onPress={handleDeleteEvent}>
  <Text style={styles.deleteEventBtnText}>🗑 Delete Event</Text>
</TouchableOpacity>
            </View>
          )}

          {/* Description */}
          <Text style={styles.sectionHeading}>About this Event</Text>
          <Text style={styles.description}>
            {event.description?.trim() ? event.description : 'No description provided yet.'}
          </Text>

          {/* ── CTA Section ── */}
          {isRegistered ? (
            // Already fully registered
            <View>
              <View style={styles.registeredBadge}>
                <Text style={styles.registeredBadgeText}>✅ You're Registered</Text>
              </View>
              <TouchableOpacity
                style={styles.unregisterButton}
                onPress={handleUnmarkInterest}
                disabled={unregLoading}
              >
                {unregLoading
                  ? <ActivityIndicator color="#ef4444" />
                  : <Text style={styles.unregisterButtonText}>✕ Remove Registration</Text>
                }
              </TouchableOpacity>
            </View>
            ) : registrationClosed ? (
  <View style={styles.fullBadge}>
    <Text style={styles.fullBadgeText}>
      🚫 Registration Closed By Organizer
    </Text>
  </View>
            ) : (deadlinePassed || registrationClosed) ? (
              <View style={styles.fullBadge}>
                  <Text style={styles.fullBadgeText}>
                      {registrationClosed
                      ? "🚫 Registration Closed By Organizer"
                      : "⛔ Registration Deadline Passed"}
                  </Text>
              </View>
            ) 
           : isFull ? (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>🔴 Registrations Closed — Event Full</Text>
            </View>
          ) : (
            // Show both buttons
            <View style={styles.ctaContainer}>
              {/* Mark Interest button — only if not yet interested */}
              {!isInterested && (
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
              )}

              {/* Already marked interest — show badge */}
              {isInterested && (
                <View style={styles.interestedBadge}>
                  <Text style={styles.interestedBadgeText}>⭐ Interest Marked</Text>
                </View>
              )}

              {/* Register Now button — always shown when not registered */}
              {isPending ? (
  <View style={styles.interestedBadge}>
    <Text style={styles.interestedBadgeText}>
      ⏳ Registration Pending
    </Text>

    <Text style={styles.interestButtonSub}>
      Complete the Google Form to confirm registration
    </Text>
  </View>
) : (
  <TouchableOpacity
    style={[
      styles.registerButton,
      deadlineSoon && styles.registerButtonUrgent,
    ]}
    onPress={handleRegisterNow}
    disabled={registerLoading}
  >
    {registerLoading ? (
      <ActivityIndicator color="white" />
    ) : (
      <View style={styles.btnInner}>
        <Text style={styles.registerButtonText}>
          {deadlineSoon
            ? '🔥 Register Now — Closing Soon!'
            : 'Register Now →'}
        </Text>

        <Text style={styles.registerButtonSub}>
          Complete Google Form to confirm registration
        </Text>
      </View>
    )}
  </TouchableOpacity>
)}
              {!event.registerLink && (
                <Text style={styles.noLinkNote}>
                  * Registering adds you to the event directly in the app.
                </Text>
              )}
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

  // ── CTA ──
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
  closeRegistrationBtn: {
  marginTop: 12,
  marginBottom: 10,
  backgroundColor: '#78350f',
  borderWidth: 1,
  borderColor: '#f59e0b',
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
},

closeRegistrationBtnText: {
  color: '#fbbf24',
  fontWeight: '700',
  fontSize: 14,
},

  deleteEventBtn: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#3a1c1c',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2a0a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteEventBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
});