// app/admin.tsx
// Updated: added Feedback tab linking to admin-feedback screen.

import { router } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Event, fetchAllEvents, updateEventStatus } from '../firebase/eventService';
import { auth, db } from '../firebase/firebaseConfig';
import { broadcastNewEventToStudents } from '../firebase/notificationService';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  role: string;
  status: string;
};

export default function AdminPanel() {
  const [tab, setTab] = useState<'organizers' | 'events' | 'feedback'>('organizers');
  const [organizers, setOrganizers] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<Record<string, UserProfile[]>>({});
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      const user = auth.currentUser;
      if (!user) { router.replace('/login'); return; }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists() && snap.data().role === 'admin') {
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
      const orgSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'organizer'))
      );
      setOrganizers(orgSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserProfile, 'id'>) })));

      const evts = await fetchAllEvents();
      setEvents(evts);

      // Load feedback counts for the badge
      const fbSnap = await getDocs(collection(db, 'feedback'));
      setFeedbackCount(fbSnap.size);
      setUnreadCount(fbSnap.docs.filter((d) => d.data().status === 'unread').length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRegisteredUsers = async (event: Event) => {
    if (!event.registeredUsers?.length) return;
    if (registeredUsers[event.id]) return;
    try {
      const profiles: UserProfile[] = [];
      for (const uid of event.registeredUsers) {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          profiles.push({ id: snap.id, ...(snap.data() as Omit<UserProfile, 'id'>) });
        }
      }
      setRegisteredUsers((prev) => ({ ...prev, [event.id]: profiles }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleEvent = async (event: Event) => {
    if (expandedEvent === event.id) {
      setExpandedEvent(null);
    } else {
      setExpandedEvent(event.id);
      await loadRegisteredUsers(event);
    }
  };

  const handleOrganizerAction = async (uid: string, status: 'approved' | 'rejected') => {
    setActionLoading(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { status });
      setOrganizers((prev) => prev.map((o) => (o.id === uid ? { ...o, status } : o)));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEventAction = async (event: Event, status: 'approved' | 'rejected') => {
    setActionLoading(event.id);
    try {
      await updateEventStatus(event.id, status);
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, status } : e)));

      if (status === 'approved') {
        try {
          await broadcastNewEventToStudents(
            event.id,
            event.title,
            event.createdBy,
            event.club
          );
        } catch (notifErr) {
          console.warn('Notification broadcast failed (non-critical):', notifErr);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin || loading) {
    return <View style={styles.centered}><ActivityIndicator color="#4f46e5" size="large" /></View>;
  }

  const pendingOrgs = organizers.filter((o) => o.status === 'pending');
  const pendingEvents = events.filter((e) => e.status === 'pending');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Admin Panel</Text>
        <Text style={styles.subheading}>CampusPulse Control Centre</Text>
      </View>

      {/* ── Stats Row ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
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
        <View style={[styles.statCard, { borderColor: unreadCount > 0 ? '#ef4444' : '#2a2a2a', borderWidth: 1 }]}>
          <Text style={[styles.statNumber, { color: unreadCount > 0 ? '#ef4444' : '#4f46e5' }]}>
            {unreadCount}
          </Text>
          <Text style={styles.statLabel}>Unread{'\n'}Feedback</Text>
        </View>
      </ScrollView>

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'organizers' && styles.tabActive]}
          onPress={() => setTab('organizers')}
        >
          <Text style={[styles.tabText, tab === 'organizers' && styles.tabTextActive]}>
            Organizers{pendingOrgs.length > 0 ? ` (${pendingOrgs.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'events' && styles.tabActive]}
          onPress={() => setTab('events')}
        >
          <Text style={[styles.tabText, tab === 'events' && styles.tabTextActive]}>
            Events{pendingEvents.length > 0 ? ` (${pendingEvents.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'feedback' && styles.tabActive]}
          onPress={() => setTab('feedback')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.tabText, tab === 'feedback' && styles.tabTextActive]}>
              Feedback
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadDot}>
                <Text style={styles.unreadDotText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Organizers Tab ── */}
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
                    <Text style={styles.cardSub}>✉️ {org.email}</Text>
                    {org.phone ? <Text style={styles.cardSub}>📞 {org.phone}</Text> : null}
                    {org.college ? <Text style={styles.cardSub}>🏫 {org.college}</Text> : null}
                    {org.department ? <Text style={styles.cardSub}>📚 {org.department}</Text> : null}
                    {org.year ? <Text style={styles.cardSub}>📅 {org.year}</Text> : null}
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
                        : <Text style={styles.actionBtnText}>✅ Approve</Text>}
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

      {/* ── Events Tab ── */}
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
                    {event.description
                      ? <Text style={styles.cardDesc} numberOfLines={2}>{event.description}</Text>
                      : null}
                  </View>
                  <StatusBadge status={event.status} />
                </View>

                {event.status === 'pending' && (
                  <>
                    <View style={styles.notifNote}>
                      <Text style={styles.notifNoteText}>
                        📣 Approving will notify all students
                      </Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleEventAction(event, 'approved')}
                        disabled={actionLoading === event.id}
                      >
                        {actionLoading === event.id
                          ? <ActivityIndicator color="white" size="small" />
                          : <Text style={styles.actionBtnText}>✅ Approve & Notify</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleEventAction(event, 'rejected')}
                        disabled={actionLoading === event.id}
                      >
                        <Text style={styles.actionBtnText}>❌ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <TouchableOpacity style={styles.registeredToggle} onPress={() => toggleEvent(event)}>
                  <Text style={styles.registeredToggleText}>
                    👥 {event.registeredUsers?.length || 0} Registered Student{event.registeredUsers?.length !== 1 ? 's' : ''}
                    {event.registeredUsers?.length > 0 ? (expandedEvent === event.id ? '  ▲' : '  ▼') : ''}
                  </Text>
                </TouchableOpacity>

                {expandedEvent === event.id && (
                  <View style={styles.registeredList}>
                    {!registeredUsers[event.id] ? (
                      <ActivityIndicator color="#4f46e5" />
                    ) : registeredUsers[event.id].length === 0 ? (
                      <Text style={styles.cardSub}>No students yet.</Text>
                    ) : (
                      registeredUsers[event.id].map((u) => (
                        <View key={u.id} style={styles.studentCard}>
                          <View style={styles.studentHeader}>
                            <View style={styles.studentAvatar}>
                              <Text style={styles.avatarText}>{u.name?.[0]?.toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.studentName}>{u.name}</Text>
                              <Text style={styles.studentDetail}>✉️ {u.email}</Text>
                              {u.phone ? <Text style={styles.studentDetail}>📞 {u.phone}</Text> : null}
                              {u.department ? <Text style={styles.studentDetail}>📚 {u.department}</Text> : null}
                              {u.year ? <Text style={styles.studentDetail}>📅 {u.year}</Text> : null}
                              {u.college ? <Text style={styles.studentDetail}>🏫 {u.college}</Text> : null}
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* ── Feedback Tab ── */}
      {tab === 'feedback' && (
        <View style={styles.section}>
          <View style={styles.feedbackSummaryRow}>
            <View style={styles.feedbackSummaryCard}>
              <Text style={styles.feedbackSummaryNumber}>{feedbackCount}</Text>
              <Text style={styles.feedbackSummaryLabel}>Total</Text>
            </View>
            <View style={[styles.feedbackSummaryCard, unreadCount > 0 && styles.feedbackSummaryCardAlert]}>
              <Text style={[styles.feedbackSummaryNumber, unreadCount > 0 && { color: '#ef4444' }]}>
                {unreadCount}
              </Text>
              <Text style={styles.feedbackSummaryLabel}>Unread</Text>
            </View>
            <View style={styles.feedbackSummaryCard}>
              <Text style={[styles.feedbackSummaryNumber, { color: '#22c55e' }]}>
                {feedbackCount - unreadCount}
              </Text>
              <Text style={styles.feedbackSummaryLabel}>Reviewed</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.feedbackEntryCard}
            onPress={() => router.push('/admin-feedback')}
            activeOpacity={0.85}
          >
            <View style={styles.feedbackEntryLeft}>
              <View style={styles.feedbackEntryIcon}>
                <Text style={{ fontSize: 24 }}>💬</Text>
              </View>
              <View>
                <Text style={styles.feedbackEntryTitle}>View All Feedback</Text>
                <Text style={styles.feedbackEntrySub}>
                  Filter · manage status · export CSV
                </Text>
              </View>
            </View>
            <Text style={styles.feedbackEntryArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.feedbackTipCard}>
            <Text style={styles.feedbackTipTitle}>💡 What you can do</Text>
            <Text style={styles.feedbackTipItem}>• Filter by category — Bug Report, UI/UX, Feature Request, etc.</Text>
            <Text style={styles.feedbackTipItem}>• Mark each item as reviewed or resolved</Text>
            <Text style={styles.feedbackTipItem}>• Export all feedback as a CSV to open in Excel or Google Sheets</Text>
            <Text style={styles.feedbackTipItem}>• See which role (student/organizer) submitted each entry</Text>
          </View>
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

  statsRow: { gap: 12, paddingHorizontal: 24, marginBottom: 24, flexDirection: 'row' },
  statCard: {
    width: 100, backgroundColor: '#1e1e1e', borderRadius: 16,
    padding: 16, alignItems: 'center', borderColor: '#2a2a2a',
  },
  statNumber: { color: '#4f46e5', fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 4 },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 24, marginBottom: 20,
    backgroundColor: '#1e1e1e', borderRadius: 12, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#4f46e5' },
  tabText: { color: '#888', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: 'white' },

  unreadDot: {
    backgroundColor: '#ef4444', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadDotText: { color: 'white', fontSize: 11, fontWeight: 'bold' },

  section: { paddingHorizontal: 24 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 15 },

  card: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cardName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardSub: { color: '#888', fontSize: 13, marginBottom: 2 },
  cardDesc: { color: '#666', fontSize: 13, marginTop: 6, lineHeight: 18 },
  notifNote: {
    backgroundColor: '#1a1a2e', borderRadius: 8, padding: 8, marginTop: 10,
    borderWidth: 1, borderColor: '#4f46e5',
  },
  notifNoteText: { color: '#818cf8', fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: {
    flex: 1, backgroundColor: '#052e16', borderWidth: 1,
    borderColor: '#22c55e', padding: 10, borderRadius: 10, alignItems: 'center',
  },
  rejectBtn: {
    flex: 1, backgroundColor: '#2a0a0a', borderWidth: 1,
    borderColor: '#ef4444', padding: 10, borderRadius: 10, alignItems: 'center',
  },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  statusBadge: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 4, alignSelf: 'flex-start',
  },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  registeredToggle: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#2a2a2a' },
  registeredToggleText: { color: '#4f46e5', fontWeight: '700', fontSize: 14 },
  registeredList: { marginTop: 12, gap: 10 },
  studentCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14 },
  studentHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  studentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center',
  },
  studentName: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  studentDetail: { color: '#aaa', fontSize: 13, marginBottom: 2 },

  feedbackSummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  feedbackSummaryCard: {
    flex: 1, backgroundColor: '#1e1e1e', borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a',
  },
  feedbackSummaryCardAlert: { borderColor: '#ef4444' },
  feedbackSummaryNumber: { color: '#4f46e5', fontSize: 24, fontWeight: 'bold' },
  feedbackSummaryLabel: { color: '#888', fontSize: 12, marginTop: 4 },

  feedbackEntryCard: {
    backgroundColor: '#1e1e1e', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, borderWidth: 1, borderColor: '#4f46e5',
  },
  feedbackEntryLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  feedbackEntryIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: '#1e1b4b', justifyContent: 'center', alignItems: 'center',
  },
  feedbackEntryTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  feedbackEntrySub: { color: '#888', fontSize: 12 },
  feedbackEntryArrow: { color: '#4f46e5', fontSize: 28, fontWeight: 'bold' },

  feedbackTipCard: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  feedbackTipTitle: { color: '#818cf8', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  feedbackTipItem: { color: '#666', fontSize: 13, marginBottom: 6, lineHeight: 18 },
});