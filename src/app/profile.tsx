// app/profile.tsx
// Updated to show history sections for students and organizers.
// - All users: "Events Participated" section
// - Organizers: additional "My Posted Events" section
// - All users: "Send Feedback" button

import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Event, fetchMyEvents, fetchMyRegisteredEvents } from '../firebase/eventService';
import { auth, db } from '../firebase/firebaseConfig';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [postedEvents, setPostedEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { router.replace('/login'); return; }

        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);

          const registered = await fetchMyRegisteredEvents();
          setRegisteredEvents(registered);

          if (data.role === 'organizer') {
            const posted = await fetchMyEvents();
            setPostedEvents(posted);
          }
        }
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>No user data found</Text>
      </View>
    );
  }

  const isOrganizer = userData.role === 'organizer';
  const approvedPosted = postedEvents.filter((e) => e.status === 'approved').length;
  const pendingPosted = postedEvents.filter((e) => e.status === 'pending').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Avatar */}
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userData.name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View>
          <Text style={styles.userName}>{userData.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {userData.role === 'admin' ? '🛡 Admin' : isOrganizer ? '🗂 Organizer' : '🎓 Student'}
            </Text>
          </View>
        </View>
      </View>

      {/* Profile Card */}
      <View style={styles.card}>
        <ProfileRow label="Email" value={userData.email} />
        <ProfileRow label="Phone" value={userData.phone || 'Not added'} />
        <ProfileRow label="Department" value={userData.department || 'Not added'} />
        <ProfileRow label="Year" value={userData.year || 'Not added'} />
        <ProfileRow label="College" value={userData.college || 'Not added'} />
      </View>

      {/* ── HISTORY SECTIONS ── */}

      {/* Organizer: My Posted Events */}
      {isOrganizer && (
        <TouchableOpacity
          style={styles.historySection}
          onPress={() => router.push('/my-events')}
          activeOpacity={0.85}
        >
          <View style={styles.historySectionLeft}>
            <View style={[styles.historyIcon, { backgroundColor: '#1e1b4b' }]}>
              <Text style={styles.historyIconEmoji}>📝</Text>
            </View>
            <View>
              <Text style={styles.historySectionTitle}>My Posted Events</Text>
              <Text style={styles.historySectionSub}>
                {postedEvents.length} event{postedEvents.length !== 1 ? 's' : ''} submitted
                {approvedPosted > 0 ? ` · ${approvedPosted} approved` : ''}
                {pendingPosted > 0 ? ` · ${pendingPosted} pending` : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.historySectionArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* All users: Events Participated */}
      <TouchableOpacity
        style={styles.historySection}
        onPress={() => router.push('/event-history')}
        activeOpacity={0.85}
      >
        <View style={styles.historySectionLeft}>
          <View style={[styles.historyIcon, { backgroundColor: '#052e16' }]}>
            <Text style={styles.historyIconEmoji}>🎟</Text>
          </View>
          <View>
            <Text style={styles.historySectionTitle}>Events Participated</Text>
            <Text style={styles.historySectionSub}>
              {registeredEvents.length > 0
                ? `${registeredEvents.length} event${registeredEvents.length !== 1 ? 's' : ''} registered`
                : 'No events registered yet'
              }
            </Text>
          </View>
        </View>
        <Text style={styles.historySectionArrow}>›</Text>
      </TouchableOpacity>

      {/* ── ACTIONS ── */}

      <View style={styles.divider} />

      {/* Send Feedback */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/feedback')}
      >
        <Text style={styles.actionButtonIcon}>💬</Text>
        <Text style={styles.actionButtonText}>Send Feedback</Text>
        <Text style={styles.actionButtonArrow}>›</Text>
      </TouchableOpacity>

      {/* Settings */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/settings')}
      >
        <Text style={styles.actionButtonIcon}>⚙️</Text>
        <Text style={styles.actionButtonText}>Settings</Text>
        <Text style={styles.actionButtonArrow}>›</Text>
      </TouchableOpacity>

      {/* Help */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/help')}
      >
        <Text style={styles.actionButtonIcon}>❓</Text>
        <Text style={styles.actionButtonText}>Help</Text>
        <Text style={styles.actionButtonArrow}>›</Text>
      </TouchableOpacity>

      {/* Admin Panel — only for admins */}
      {userData.role === 'admin' && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin')}
        >
          <Text style={styles.actionButtonIcon}>🛡</Text>
          <Text style={styles.actionButtonText}>Admin Panel</Text>
          <Text style={styles.actionButtonArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Log Out */}
      <TouchableOpacity
        style={[styles.actionButton, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={styles.actionButtonIcon}>🚪</Text>
        <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Log Out</Text>
        <Text style={styles.actionButtonArrow}>›</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 24, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  text: { color: 'white' },

  avatarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  userName: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  roleBadge: {
    backgroundColor: '#1e1b4b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: '#4f46e5',
  },
  roleBadgeText: { color: '#818cf8', fontSize: 12, fontWeight: '700' },

  card: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16, marginBottom: 20 },
  profileRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  profileLabel: { color: '#888', fontSize: 14 },
  profileValue: { color: 'white', fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  // ── History section cards ──
  historySection: {
    backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a',
  },
  historySectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  historyIcon: {
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  historyIconEmoji: { fontSize: 22 },
  historySectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  historySectionSub: { color: '#888', fontSize: 12 },
  historySectionArrow: { color: '#444', fontSize: 24, paddingLeft: 8 },

  divider: { height: 1, backgroundColor: '#2a2a2a', marginVertical: 16 },

  // ── Action buttons ──
  actionButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e1e1e', padding: 16, borderRadius: 14,
    marginBottom: 10,
  },
  logoutButton: { borderWidth: 1, borderColor: '#3a1c1c' },
  actionButtonIcon: { fontSize: 20, width: 28 },
  actionButtonText: { flex: 1, color: 'white', fontSize: 16, fontWeight: '500' },
  actionButtonArrow: { color: '#444', fontSize: 20 },
});