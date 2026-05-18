// app/event-details.tsx

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import {
  Event,
  fetchEventById,
  markInterest,
  unmarkInterest,
} from '../firebase/eventService';

import { auth, db } from '../firebase/firebaseConfig';

import { doc, getDoc } from 'firebase/firestore';

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // NEW
  const [role, setRole] = useState<string | null>(null);

  const currentUid = auth.currentUser?.uid;

  const isInterested =
    event?.registeredUsers?.includes(currentUid ?? '') ?? false;

  const count = event?.registeredUsers?.length ?? 0;

  // Load event + user role
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!id) return;

        // Fetch event
        const eventData = await fetchEventById(id);
        setEvent(eventData);

        // Fetch current user role
        const user = auth.currentUser;

        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));

          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          }
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Interest button logic
  const handleInterest = async () => {
    if (!currentUid) {
      Alert.alert(
        'Login required',
        'Please log in to mark your interest.'
      );
      return;
    }

    setActionLoading(true);

    try {
      if (isInterested) {
        await unmarkInterest(id!);
      } else {
        await markInterest(id!);
      }

      // Refresh event
      const updated = await fetchEventById(id!);
      setEvent(updated);

    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // External registration link
  const handleRegisterLink = () => {
    if (!event?.registerLink) {
      Alert.alert(
        'No link',
        'The organizer has not added a registration link yet.'
      );
      return;
    }

    Linking.openURL(event.registerLink).catch(() =>
      Alert.alert(
        'Error',
        'Could not open the registration link.'
      )
    );
  };

  // Loading screen
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  // Event not found
  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Event not found.
        </Text>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>
            ← Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>
          ← Back
        </Text>
      </TouchableOpacity>

      {/* Category badge */}
      {event.category ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {event.category}
          </Text>
        </View>
      ) : null}

      {/* Title */}
      <Text style={styles.title}>
        {event.title}
      </Text>

      {/* Info rows */}
      <View style={styles.infoCard}>
        <InfoRow
          icon="📍"
          label="Venue"
          value={event.venue}
        />

        <InfoRow
          icon="🕒"
          label="Time"
          value={event.time}
        />

        <InfoRow
          icon="🏷"
          label="Organised by"
          value={event.club}
        />
      </View>

      {/* Student count */}
      <View style={styles.countCard}>
        <Text style={styles.countNumber}>
          {count}
        </Text>

        <Text style={styles.countLabel}>
          registered student{count !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.sectionHeading}>
        About this Event
      </Text>

      <Text style={styles.description}>
        {event.description?.trim()
          ? event.description
          : 'No description provided by the organizer yet.'}
      </Text>

      {/* Interest button */}
      <TouchableOpacity
        style={[
          styles.interestButton,
          isInterested && styles.interestButtonActive,
        ]}
        onPress={handleInterest}
        disabled={actionLoading}
      >
        {actionLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.interestButtonText}>
            {isInterested
              ? '✅ Interested'
              : '🔔 Mark as Interested'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Register button */}
      <TouchableOpacity
        style={styles.registerButton}
        onPress={handleRegisterLink}
      >
        <Text style={styles.registerButtonText}>
          Register Now →
        </Text>
      </TouchableOpacity>

      {/* Organizer/Admin only */}
      {(role === 'organizer' || role === 'admin') && (
        <TouchableOpacity
          style={styles.viewRegistrationsButton}
          onPress={() =>
            router.push(`/event-registrations?id=${event.id}`)
          }
        >
          <Text style={styles.viewRegistrationsText}>
            👥 View Registered Students
          </Text>
        </TouchableOpacity>
      )}

      {/* No registration link */}
      {!event.registerLink && (
        <Text style={styles.noLinkNote}>
          * Registration link will be added by the organizer soon.
        </Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Helper component
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>
        {icon}
      </Text>

      <View>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  content: {
    padding: 24,
    paddingTop: 60,
  },

  centered: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Back
  backButton: {
    marginBottom: 20,
  },

  backButtonText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '600',
  },

  // Badge
  badge: {
    backgroundColor: '#1e1b4b',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 14,
  },

  badgeText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '700',
  },

  // Title
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    lineHeight: 36,
  },

  // Info card
  infoCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 16,
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
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  infoValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },

  // Count card
  countCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4f46e5',
  },

  countNumber: {
    color: '#818cf8',
    fontSize: 48,
    fontWeight: 'bold',
  },

  countLabel: {
    color: '#a5b4fc',
    fontSize: 15,
    marginTop: 4,
  },

  // Description
  sectionHeading: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  description: {
    color: '#cccccc',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 28,
  },

  // Interest button
  interestButton: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1.5,
    borderColor: '#4f46e5',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },

  interestButtonActive: {
    backgroundColor: '#1e1b4b',
  },

  interestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Register button
  registerButton: {
    backgroundColor: '#22c55e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },

  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // View registrations button
  viewRegistrationsButton: {
    backgroundColor: '#0f766e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },

  viewRegistrationsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  noLinkNote: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
  },

  // Error
  errorText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 12,
  },

  backLink: {
    color: '#4f46e5',
    fontSize: 15,
  },
});