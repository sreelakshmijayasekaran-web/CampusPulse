// app/event-details.tsx
import { AppState } from "react-native";
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
import { Colors, Gradients } from '../constants/theme';
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

// Combines deadlineDate ("2026-05-27") and deadlineTime ("23:00") into a single
// ISO-like string ("2026-05-27T23:00") for use with Date() and isDeadlineWithin12Hours.
// Returns null if either part is missing.
const getDeadlineDateTime = (event: Event | null): string | null => {
  if (!event?.deadlineDate || !event?.deadlineTime) return null;
  return `${event.deadlineDate}T${event.deadlineTime}`;
};

// Formats deadlineDate + deadlineTime for display, e.g. "27 May 2026, 11:00 PM"
const formatDeadline = (event: Event | null): string => {
  const combined = getDeadlineDateTime(event);
  if (!combined) return '';
  const date = new Date(combined);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
      const userSnap = await getDoc(doc(db, 'users', currentUid));
      
      if (userSnap.exists()) {
        const role = userSnap.data().role;
        const status = userSnap.data().status;

        // Check if admin
        if (role === 'admin') {
          setIsAdmin(true);
        }

        // Check if organizer of THIS event
        if (
          evt.createdBy === currentUid &&
          role === 'organizer' &&
          status === 'approved'
        ) {
          setIsOrganizer(true);
        }
      }

      // Check if user has already marked interest
      if (evt.interestedUsers?.includes(currentUid)) {
        setHasMarkedInterest(true);
      }
    }

    setLoading(false);
  };
  load();
}, [id]);
  useEffect(() => {
  const subscription = AppState.addEventListener(
    "change",
    (nextState) => {

      if (
        nextState === "active" &&
        (global as any).registrationInProgress
      ) {
        (global as any).registrationInProgress = false;

        router.push(
          `/registration-confirmation?eventId=${(global as any).registrationEventId}`
        );
      }
    }
  );

  return () => subscription.remove();
}, []);

  // User is in registeredUsers → fully registered
  const isRegistered = event?.registeredUsers?.includes(currentUid ?? '') ?? false;
  const isPending =
  event?.pendingRegistrations?.includes(currentUid ?? '') ?? false;
  // User is in interestedUsers → marked interest but not yet registered
  const isInterested = event?.interestedUsers?.includes(currentUid ?? '') ?? false;

  const count = event?.registeredUsers?.length ?? 0;
  const seatLimit = event?.seatLimit ?? null;
  const isFull = seatLimit !== null && count >= seatLimit;
  const deadlineDateTime = getDeadlineDateTime(event);
  const deadlinePassed =
  deadlineDateTime
    ? new Date(deadlineDateTime) < new Date()
    : false;
  const deadlineSoon = deadlineDateTime ? isDeadlineWithin12Hours(deadlineDateTime) : false;
  
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
      const updatedDeadline = getDeadlineDateTime(updated);
      if (updatedDeadline && isDeadlineWithin12Hours(updatedDeadline)) {
        await sendNotificationToUser(
          currentUid,
          `⏰ Deadline Soon: ${event?.title}`,
          `You marked interest in "${event?.title}". Registration closes in less than 12 hours: ${formatDeadline(updated)}. Register now!`,
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
  console.log("REGISTER BUTTON CLICKED");

  if (deadlineDateTime && new Date(deadlineDateTime) < new Date()) {
    Alert.alert(
      "Registration Closed",
      "The registration deadline has passed."
    );
    return;
  }

  if (!currentUid) {
    Alert.alert("Login required", "Please log in first.");
    return;
  }

  if (isFull) {
    Alert.alert(
      "Event Full",
      "Sorry, this event has reached its seat limit."
    );
    return;
  }

  console.log("Passed initial checks");

  setRegisterLoading(true);

  try {
    console.log("Fetching fresh event...");

    const fresh = await fetchEventById(id!);

    console.log("Fresh event:", fresh);

    const freshCount = fresh?.registeredUsers?.length ?? 0;
    const freshLimit = fresh?.seatLimit ?? null;

    console.log("freshCount =", freshCount);
    console.log("freshLimit =", freshLimit);

    if (freshLimit !== null && freshCount >= freshLimit) {
      Alert.alert("Event Full", "Sorry, no seats left.");
      setRegisterLoading(false);
      return;
    }

    console.log("Before getDoc");

    const userSnap = await getDoc(
      doc(db, "users", currentUid)
    );

    console.log("After getDoc");

    if (!userSnap.exists()) {
      console.log("User document not found");
      Alert.alert("Error", "User profile not found.");
      return;
    }

    console.log("User exists");

    const userData = userSnap.data();

    console.log("User data =", userData);

    console.log("Before updateDoc");

    await updateDoc(doc(db, "events", id!), {
      pendingRegistrations: arrayUnion(currentUid),
    });

    console.log("After updateDoc");

    const formLink = event?.registerLink?.trim();

    console.log("Form link =", formLink);

    if (!formLink) {
      Alert.alert(
        "Error",
        "No registration link found for this event."
      );
      return;
    }

    console.log("Before canOpenURL");

    const supported = await Linking.canOpenURL(formLink);

    console.log("CAN OPEN =", supported);

    if (!supported) {
      Alert.alert("Cannot open form link");
      return;
    }

    console.log("Opening URL");
    (global as any).registrationInProgress = true;
    (global as any).registrationEventId = id;
    await Linking.openURL(formLink);
    router.push(
  `/registration-confirmation?eventId=${id}`
);
    console.log("URL opened successfully");

    Alert.alert(
      "Complete Registration",
      "Please submit the Google Form to complete your registration."
    );

  } catch (err: any) {
    console.log("REGISTER ERROR =", err);
    console.log("REGISTER ERROR MESSAGE =", err?.message);
    console.log("REGISTER ERROR CODE =", err?.code);

    Alert.alert(
      "Error",
      err?.message || "Unknown error"
    );
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
};
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
  const now = new Date();

    const eventDate = event?.time
      ? new Date(event.time)
      : null;

    const eventEnded = eventDate && eventDate < now;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.light.primary} size="large" />
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
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

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
              <LinearGradient
                colors={Gradients.light.primary}
                style={styles.posterPlaceholder}
              >
                <Text style={styles.posterPlaceholderText}>🎉</Text>
              </LinearGradient>
            )}
          </Animated.View>

          <LinearGradient
            colors={['transparent', 'rgba(248, 250, 252, 0.7)', Colors.light.background]}
            locations={[0.3, 0.75, 1]}
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
                ⏰ Registration closes in less than 12 hours! Deadline: {formatDeadline(event)}
              </Text>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <InfoRow icon="📍" label="Venue" value={event.venue} />
            <InfoRow icon="🕒" label="Date & Time" value={formatDateTime(event.time)}/>
            <InfoRow icon="🏷" label="Organised by" value={event.club} />
            {deadlineDateTime && (
              <InfoRow icon="⏰" label="Registration Deadline" value={formatDeadline(event)} />
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

          {/* Organizer Section: registered students */}
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
                    <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 10 }} />
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

              {/* Toggle Event status button */}
              <TouchableOpacity
                style={styles.closeRegistrationBtn}
                onPress={handleToggleRegistration}
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
          {eventEnded ? (
  <View style={styles.fullBadge}>
    <Text style={styles.fullBadgeText}>
      ✅ Event Completed
    </Text>
  </View>
) : isRegistered ? (
  <View>
    <View style={styles.registeredBadge}>
      <Text style={styles.registeredBadgeText}>
        ✅ You're Registered
      </Text>
    </View>

    <TouchableOpacity
      style={styles.unregisterButton}
      onPress={handleUnmarkInterest}
      disabled={unregLoading}
    >
      {unregLoading ? (
        <ActivityIndicator color={Colors.light.error} />
      ) : (
        <Text style={styles.unregisterButtonText}>
          ✕ Remove Registration
        </Text>
      )}
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
          ) : isFull ? (
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
                  activeOpacity={0.85}
                >
                  {interestLoading ? (
                    <ActivityIndicator color={Colors.light.primary} />
                  ) : (
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
                  )}
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
                  style={styles.registerButton}
                  onPress={handleRegisterNow}
                  disabled={registerLoading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={deadlineSoon ? ['#F97316', '#EA580C'] : Gradients.light.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.registerButtonGradient}
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
                  </LinearGradient>
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
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.light.text,
    fontSize: 16,
    fontFamily: 'Sora_700Bold',
    marginBottom: 12,
  },
  backLink: {
    color: Colors.light.primary,
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },

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
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  floatingHeaderBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  floatingHeaderBtnText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
  },

  heroContainer: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    position: 'relative',
  },
  posterWrapper: {
    position: 'absolute',
    top: -40,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    fontSize: 64,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.75,
  },
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroPillBtnText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Sora_700Bold',
  },
  heroTextBlock: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 10,
  },
  badgeText: {
    color: Colors.light.primary,
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
    letterSpacing: 0.5,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Sora_700Bold',
    lineHeight: 32,
    textShadowColor: 'rgba(15, 23, 42, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  deadlineBanner: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: '#F97316',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  deadlineBannerText: {
    color: '#D97706',
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    lineHeight: 18,
  },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIcon: {
    fontSize: 22,
  },
  infoLabel: {
    color: Colors.light.textSecondary,
    fontSize: 10,
    fontFamily: 'Sora_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    marginTop: 2,
  },

  countCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  countNumber: {
    color: Colors.light.primary,
    fontSize: 48,
    fontFamily: 'Sora_700Bold',
  },
  countLabel: {
    color: Colors.light.primary,
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    marginTop: 4,
  },
  seatBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: Colors.light.success,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  seatBadgeFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: Colors.light.error,
  },
  seatBadgeText: {
    color: Colors.light.success,
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
  },
  seatBadgeTextFull: {
    color: Colors.light.error,
  },

  organizerSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  studentsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentsToggleText: {
    color: Colors.light.primary,
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
  },
  studentsList: {
    marginTop: 14,
    gap: 10,
  },
  noStudents: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
    marginTop: 8,
  },
  studentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  studentRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
  },
  studentName: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    marginBottom: 4,
  },
  studentDetail: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    marginBottom: 2,
  },
  studentDetailMissing: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    marginBottom: 2,
    fontStyle: 'italic',
  },

  sectionHeading: {
    color: Colors.light.text,
    fontSize: 16,
    fontFamily: 'Sora_700Bold',
    marginBottom: 10,
  },
  description: {
    color: '#475569',
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    lineHeight: 22,
    marginBottom: 28,
  },

  // ── CTA ──
  ctaContainer: {
    gap: 12,
    marginBottom: 10,
  },

  btnInner: {
    alignItems: 'center',
    gap: 2,
  },

  interestButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  interestButtonUrgent: {
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderColor: '#F97316',
  },
  interestButtonText: {
    color: Colors.light.primary,
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
  },
  interestButtonSub: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Sora_400Regular',
  },

  interestedBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(79, 70, 229, 0.3)',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  interestedBadgeText: {
    color: Colors.light.primary,
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
  },

  registerButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  registerButtonGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonUrgent: {
    backgroundColor: '#F97316',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
  },
  registerButtonSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Sora_400Regular',
  },

  registeredBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  registeredBadgeText: {
    color: '#10B981',
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
  },

  unregisterButton: {
    borderWidth: 1,
    borderColor: Colors.light.error,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  unregisterButtonText: {
    color: Colors.light.error,
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },

  fullBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1.5,
    borderColor: Colors.light.error,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  fullBadgeText: {
    color: Colors.light.error,
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
  },
  noLinkNote: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  closeRegistrationBtn: {
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeRegistrationBtnText: {
    color: '#D97706',
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
  },

  deleteEventBtn: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: Colors.light.error,
  },
  deleteEventBtnText: {
    color: Colors.light.error,
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
  },
});