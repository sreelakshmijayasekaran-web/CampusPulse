// app/event-details.tsx
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';

import { LinearGradient } from 'expo-linear-gradient';
import {
  arrayUnion,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal
} from 'react-native';
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

const getDeadlineDateTime = (event: Event | null): string | null => {
  if (!event?.deadlineDate || !event?.deadlineTime) return null;
  return `${event.deadlineDate}T${event.deadlineTime}`;
};

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
  const [hasMarkedInterest, setHasMarkedInterest] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

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

          if (role === 'admin') {
            setIsAdmin(true);
          }

          if (
            evt.createdBy === currentUid &&
            role === 'organizer' &&
            status === 'approved'
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
  const isPending =
    event?.pendingRegistrations?.includes(currentUid ?? '') ?? false;
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
  const requiresRegistration = event?.requiresRegistration ?? true;

  // Who can see the meeting link: everyone if open event, otherwise only
  // people who are registered, the organizer, or an admin.
  const canSeeMeetingLink =
    !!event?.meetingLink &&
    (!requiresRegistration || isRegistered || isOrganizer || isAdmin);

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

  const handleRegisterNow = async () => {
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

    setRegisterLoading(true);

    try {
      const fresh = await fetchEventById(id!);

      const freshCount = fresh?.registeredUsers?.length ?? 0;
      const freshLimit = fresh?.seatLimit ?? null;

      if (freshLimit !== null && freshCount >= freshLimit) {
        Alert.alert("Event Full", "Sorry, no seats left.");
        return;
      }

      const formLink = event?.registerLink?.trim();

      if (!formLink) {
        Alert.alert(
          "Error",
          "No registration link found for this event."
        );
        return;
      }

      const supported = await Linking.canOpenURL(formLink);

      if (!supported) {
        Alert.alert(
          "Error",
          "Cannot open registration form."
        );
        return;
      }

      (global as any).registrationEventId = id;

      await Linking.openURL(formLink);

      router.push(
        `/registration-confirmation?eventId=${id}`
      );

    } catch (err: any) {
      console.log("REGISTER ERROR =", err);

      Alert.alert(
        "Error",
        err?.message || "Unknown error"
      );
    } finally {
      setRegisterLoading(false);
    }
  };
  const handleUnmarkInterest = () => {
  setShowRemoveModal(true);
};
const confirmRemoveRegistration = async () => {
  setUnregLoading(true);

  try {
    await unmarkInterest(id!);
    const updated = await fetchEventById(id!);
    setEvent(updated);
  } catch (err: any) {
    Alert.alert("Error", err.message);
  } finally {
    setUnregLoading(false);
    setShowRemoveModal(false);
  }
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

  const handleDeleteEvent = async () => {

    const eventId = Array.isArray(id) ? id[0] : id;

    if (!eventId) {
      Alert.alert("Error", "Event ID not found.");
      return;
    }

    try {

      if (isAdmin) {

        await deleteDoc(doc(db, "events", eventId));

        Alert.alert(
          "Deleted",
          "Event permanently deleted."
        );
      }

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

  const handleOpenMeetingLink = async () => {
    const link = event?.meetingLink?.trim();
    if (!link) return;
    const supported = await Linking.canOpenURL(link);
    if (!supported) {
      Alert.alert('Error', 'Cannot open this link.');
      return;
    }
    await Linking.openURL(link);
  };

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

          {/* Open event banner */}
          {!requiresRegistration && (
            <View style={styles.openEventBanner}>
              <Text style={styles.openEventBannerText}>
                🌐 Open Event — anyone can join, no registration needed.
              </Text>
            </View>
          )}

          {/* Deadline warning banner */}
          {requiresRegistration && deadlineSoon && !isRegistered && (
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
            {requiresRegistration && deadlineDateTime && (
              <InfoRow icon="⏰" label="Registration Deadline" value={formatDeadline(event)} />
            )}
          </View>

          {/* Meeting Link Card */}
          {event.meetingLink && (
            canSeeMeetingLink ? (
              <View style={styles.meetingCard}>
                <Text style={styles.meetingCardTitle}>🔗 Meeting Link</Text>
                {event.meetingLinkDescription ? (
                  <Text style={styles.meetingCardDesc}>{event.meetingLinkDescription}</Text>
                ) : null}
                <TouchableOpacity
                  style={styles.meetingButton}
                  onPress={handleOpenMeetingLink}
                  activeOpacity={0.85}
                >
                  <Text style={styles.meetingButtonText}>Join Meeting →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.meetingLockedCard}>
                <Text style={styles.meetingLockedText}>
                  🔒 The meeting link will be visible once you register for this event.
                </Text>
              </View>
            )
          )}

          {/* Seat count card — only relevant when registration is required */}
          {requiresRegistration && (
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
          )}

          {/* Organizer Section: registered students (only meaningful if registration required) */}
          {isOrganizer && requiresRegistration && (
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

              <TouchableOpacity style={styles.deleteEventBtn} onPress={handleDeleteEvent}>
                <Text style={styles.deleteEventBtnText}>🗑 Delete Event</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Organizer delete button for open events (no students list/close-registration needed) */}
          {isOrganizer && !requiresRegistration && (
            <View style={styles.organizerSection}>
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
          {!requiresRegistration ? (
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeText}>
                🌐 No registration needed — just show up{event.meetingLink ? ' or join the link above' : ''}.
              </Text>
            </View>
          ) : eventEnded ? (
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
            <View style={styles.ctaContainer}>
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

              {isInterested && (
                <View style={styles.interestedBadge}>
                  <Text style={styles.interestedBadgeText}>⭐ Interest Marked</Text>
                </View>
              )}

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
      <Modal
  visible={showRemoveModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowRemoveModal(false)}
>
  <View
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <View
      style={{
        width: 300,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 18,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Remove Registration
      </Text>

      <Text
        style={{
          textAlign: "center",
          color: "#64748B",
          marginBottom: 18,
        }}
      >
        Are you sure you want to remove your registration?
      </Text>

      <View
        style={{
          flexDirection: "row",
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "#E5E7EB",
            paddingVertical: 10,
            borderRadius: 8,
            marginRight: 6,
            alignItems: "center",
          }}
          onPress={() => setShowRemoveModal(false)}
        >
          <Text>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "#EF4444",
            paddingVertical: 10,
            borderRadius: 8,
            marginLeft: 6,
            alignItems: "center",
          }}
          onPress={confirmRemoveRegistration}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Remove
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
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

  openEventBanner: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  openEventBannerText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    lineHeight: 18,
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

  meetingCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  meetingCardTitle: {
    color: '#047857',
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
    marginBottom: 6,
  },
  meetingCardDesc: {
    color: '#065F46',
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    lineHeight: 19,
    marginBottom: 12,
  },
  meetingButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  meetingButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
  },
  meetingLockedCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  meetingLockedText: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    lineHeight: 19,
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
  openBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  openBadgeText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    textAlign: 'center',
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