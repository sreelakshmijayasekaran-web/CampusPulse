// app/admin.tsx  ← NEW file

import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, getDocs, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { fetchAllEvents, updateEventStatus, Event } from '../firebase/eventService';

type OrganizerRequest = {
  id: string;
  name: string;
  email: string;
  college: string;
  status: string;
};

export default function AdminPanel() {
  const [tab, setTab] = useState<'organizers' | 'events'>('organizers');
  const [organizers, setOrganizers] = useState<OrganizerRequest[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    const check = async () => {
      const user = auth.currentUser;
      if (!user) { router.replace('/login'); return; }
      const snap = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', user.uid))
      );
      if (!snap.empty && snap.docs[0].data().role === 'admin') {
        setIsAdmin(true);
        loadData();
      } else {
        Alert.alert('Access Denied', 'You are not an admin.');
        router.replace('/');
      }
    };
    check();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch pending organizer requests
      const orgSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'organizer'))
      );
      const orgs = orgSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<OrganizerRequest, 'id'>),
      }));
      setOrganizers(orgs);

      // Fetch all events
      const evts = await fetchAllEvents();
      setEvents(evts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizerAction = async (uid: string, status: 'approved' | 'rejected') => {
    setActionLoading(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { status });
      setOrganizers((prev) =>
        prev.map((o) => (o.id === uid ? { ...o, status } : o))
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEventAction = async (eventId: string, status: 'approved' | 'rejected') => {
    setActionLoading(eventId);
    try {
      await updateEventStatus(eventId, status);
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status } : e))
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  const pendingOrgs = organizers.filter((o) => o.status === 'pending');
  const pendingEvents = events.filter((e) => e.status === 'pending');

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Admin Panel</Text>
        <Text style={styles.subheading}>CampusPulse Control Centre</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingOrgs.length}</Text>
          <Text style={styles.statLabel}>Pending{'\n'}Organizers</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingEvents.length}</Text>
          <Text style={styles.statLabel}>Pending{'\n'}Events</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{organizers.filter(o => o.status === 'approved').length}</Text>
          <Text style={styles.statLabel}>Approved{'\n'}Organizers</Text>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'organizers' && styles.tabActive]}
          onPress={() => setTab('organizers')}
        >
          <Text style={[styles.tabText, tab === 'organizers' && styles.tabTextActive]}>
            Organizers {pendingOrgs.length > 0 ? `(${pendingOrgs.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'events' && styles.tabActive]}
          onPress={() => setTab('events')}
        >
          <Text style={[styles.tabText, tab === 'events' && styles.tabTextActive]}>
            Events {pendingEvents.length > 0 ? `(${pendingEvents.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Organizers tab */}
      {tab === 'organizers' && (
        <View style={styles.section}>
          {organizers.length === 0 ? (
            <Text style={styles.emptyText}>No organizer requests yet.</Text>
          ) : (
            organizers.map((org) => (
              <View key={org.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{org.name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{org.name}</Text>
                    <Text style={styles.cardSub}>{org.email}</Text>
                    <Text style={styles.cardSub}>{org.college}</Text>
                  </View>
                  <StatusBadge status={org.status} />
                </View>

                {org.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleOrganizerAction(org.id, 'approved')}
                      disabled={actionLoading === org.id}
                    >
                      {actionLoading === org.id
                        ? <ActivityIndicator color="white" size="small" />
                        : <Text style={styles.actionBtnText}>✅ Approve</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleOrganizerAction(org.id, 'rejected')}
                      disabled={actionLoading === org.id}
                    >
                      <Text style={styles.actionBtnText}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* Events tab */}
      {tab === 'events' && (
        <View style={styles.section}>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>No events submitted yet.</Text>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{event.title}</Text>
                    <Text style={styles.cardSub}>📍 {event.venue}  🕒 {event.time}</Text>
                    <Text style={styles.cardSub}>🏷 {event.club}  •  {event.category}</Text>
                    {event.description ? (
                      <Text style={styles.cardDesc} numberOfLines={2}>{event.description}</Text>
                    ) : null}
                  </View>
                  <StatusBadge status={event.status} />
                </View>

                {event.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleEventAction(event.id, 'approved')}
                      disabled={actionLoading === event.id}
                    >
                      {actionLoading === event.id
                        ? <ActivityIndicator color="white" size="small" />
                        : <Text style={styles.actionBtnText}>✅ Approve</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleEventAction(event.id, 'rejected')}
                      disabled={actionLoading === event.id}
                    >
                      <Text style={styles.actionBtnText}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'approved' ? '#22c55e' : status === 'rejected' ? '#ef4444' : '#f59e0b';
  const bg = status === 'approved' ? '#052e16' : status === 'rejected' ? '#2a0a0a' : '#2a1f00';
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg, borderColor: color }]}>
      <Text style={[styles.statusText, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centered: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },

  header: { padding: 24, paddingTop: 60 },
  backText: { color: '#4f46e5', fontSize: 15, fontWeight: '600', marginBottom: 16 },
  heading: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  subheading: { color: '#888', fontSize: 14, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16, alignItems: 'center' },
  statNumber: { color: '#4f46e5', fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 4 },

  tabRow: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 20, backgroundColor: '#1e1e1e', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#4f46e5' },
  tabText: { color: '#888', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: 'white' },

  section: { paddingHorizontal: 24 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 15 },

  card: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cardName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardSub: { color: '#888', fontSize: 13, marginBottom: 2 },
  cardDesc: { color: '#666', fontSize: 13, marginTop: 6, lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  approveBtn: { flex: 1, backgroundColor: '#052e16', borderWidth: 1, borderColor: '#22c55e', padding: 10, borderRadius: 10, alignItems: 'center' },
  rejectBtn: { flex: 1, backgroundColor: '#2a0a0a', borderWidth: 1, borderColor: '#ef4444', padding: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  statusBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
});