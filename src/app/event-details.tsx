// app/event-details.tsx

import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Event, fetchEventById, markInterest } from '../firebase/eventService';
import { auth, db } from '../firebase/firebaseConfig';

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

  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const evt = await fetchEventById(id);
      setEvent(evt);
      if (evt && currentUid && evt.createdBy === currentUid) {
        setIsOrganizer(true);
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
    return <View style={styles.centered}><ActivityIndicator color="#4f46e5" size="large" /></View>;
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Back + Edit row */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        {isOrganizer && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/create-event?id=${event.id}`)}
          >
            <Text style={styles.editButtonText}>✏️ Edit Event</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Poster Image */}
      {event.posterUrl ? (
        <Image
          source={{ uri: event.posterUrl }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : null}

      {/* Category Badge */}
      {event.category ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{event.category}</Text>
        </View>
      ) : null}

      {/* Title */}
      <Text style={styles.title}>{event.title}</Text>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <InfoRow icon="📍" label="Venue" value={event.venue} />
        <InfoRow icon="🕒" label="Date & Time" value={event.time} />
        <InfoRow icon="🏷" label="Organised by" value={event.club} />
        {event.deadline ? (
          <InfoRow icon="⏰" label="Registration Deadline" value={event.deadline} />
        ) : null}
      </View>

      {/* Seat limit + count */}
      <View style={styles.countCard}>
        <Text style={styles.countNumber}>{count}</Text>
        <Text style={styles.countLabel}>
          student{count !== 1 ? 's' : ''} registered
        </Text>
        {seatLimit !== null && (
          <View style={[styles.seatBadge, isFull && styles.seatBadgeFull]}>
            <Text style={[styles.seatBadgeText, isFull && styles.seatBadgeTextFull]}>
              {isFull ? '🔴 Full' : `🟢 ${seatLimit - count} seat${seatLimit - count !== 1 ? 's' : ''} left`}
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
                        {u.department
                          ? <Text style={styles.studentDetail}>📚 {u.department}</Text>
                          : null
                        }
                        {u.year
                          ? <Text style={styles.studentDetail}>📅 {u.year}</Text>
                          : <Text style={styles.studentDetailMissing}>📅 Year not provided</Text>
                        }
                        {u.college
                          ? <Text style={styles.studentDetail}>🏫 {u.college}</Text>
                          : null
                        }
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

      {/* Register button */}
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

      <View style={{ height: 40 }} />
    </ScrollView>
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
  content: { padding: 24, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: { color: '#4f46e5', fontSize: 16, fontWeight: '600' },
  editButton: {
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#4f46e5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editButtonText: { color: '#818cf8', fontWeight: '700', fontSize: 13 },

  poster: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
  },

  badge: { backgroundColor: '#1e1b4b', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginBottom: 14 },
  badgeText: { color: '#818cf8', fontSize: 13, fontWeight: '700' },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 24, lineHeight: 36 },

  infoCard: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 20, marginBottom: 20, gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoIcon: { fontSize: 22 },
  infoLabel: { color: '#888', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { color: 'white', fontSize: 16, fontWeight: '500', marginTop: 2 },

  countCard: { backgroundColor: '#1e1b4b', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#4f46e5' },
  countNumber: { color: '#818cf8', fontSize: 48, fontWeight: 'bold' },
  countLabel: { color: '#a5b4fc', fontSize: 15, marginTop: 4 },
  seatBadge: { marginTop: 10, backgroundColor: '#052e16', borderWidth: 1, borderColor: '#22c55e', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  seatBadgeFull: { backgroundColor: '#2a0a0a', borderColor: '#ef4444' },
  seatBadgeText: { color: '#22c55e', fontWeight: '700', fontSize: 13 },
  seatBadgeTextFull: { color: '#ef4444' },

  organizerSection: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16, marginBottom: 24 },
  studentsToggle: { flexDirection: 'row', alignItems: 'center' },
  studentsToggleText: { color: '#4f46e5', fontWeight: '700', fontSize: 15 },
  studentsList: { marginTop: 14, gap: 10 },
  noStudents: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 8 },
  studentCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14 },
  studentRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  studentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  studentName: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  studentDetail: { color: '#aaa', fontSize: 13, marginBottom: 2 },
  studentDetailMissing: { color: '#555', fontSize: 13, marginBottom: 2, fontStyle: 'italic' },

  sectionHeading: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  description: { color: '#cccccc', fontSize: 15, lineHeight: 24, marginBottom: 28 },

  registerButton: { backgroundColor: '#22c55e', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  registerButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  registeredBadge: { backgroundColor: '#052e16', borderWidth: 1.5, borderColor: '#22c55e', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  registeredBadgeText: { color: '#22c55e', fontSize: 16, fontWeight: 'bold' },
  fullBadge: { backgroundColor: '#2a0a0a', borderWidth: 1.5, borderColor: '#ef4444', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  fullBadgeText: { color: '#ef4444', fontSize: 15, fontWeight: 'bold' },
  noLinkNote: { color: '#555', fontSize: 12, textAlign: 'center' },
  errorText: { color: 'white', fontSize: 18, marginBottom: 12 },
  backLink: { color: '#4f46e5', fontSize: 15 },
});