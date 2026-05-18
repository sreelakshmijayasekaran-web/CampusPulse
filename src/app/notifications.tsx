// app/notifications.tsx

import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { router } from 'expo-router';
import {
    collection, doc, onSnapshot, orderBy,
    query, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: any;
  type?: string;
  eventId?: string;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) { router.replace('/login'); return; }

    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notification, 'id'>) }))
      );
      setLoading(false);
    });

    return unsub;
  }, []);

  const markAsRead = async (notifId: string) => {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }));
    await batch.commit();
  };

  const handlePress = async (notif: Notification) => {
    if (!notif.read) await markAsRead(notif.id);
    if (notif.eventId) router.push(`/event-details?id=${notif.eventId}`);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>Notifications</Text>
      {unreadCount > 0 && (
        <Text style={styles.unreadLabel}>{unreadCount} unread</Text>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>You'll be notified about events and updates here.</Text>
        </View>
      ) : (
        notifications.map((notif) => (
          <TouchableOpacity
            key={notif.id}
            style={[styles.card, !notif.read && styles.cardUnread]}
            onPress={() => handlePress(notif)}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <Text style={styles.notifTitle}>{notif.title}</Text>
              {!notif.read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notifBody}>{notif.body}</Text>
            {notif.createdAt?.toDate && (
              <Text style={styles.notifTime}>
                {notif.createdAt.toDate().toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            )}
            {notif.eventId && (
              <Text style={styles.tapHint}>Tap to view event →</Text>
            )}
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backText: { color: '#4f46e5', fontSize: 15, fontWeight: '600' },
  markAllText: { color: '#888', fontSize: 13, fontWeight: '600' },

  title: { color: 'white', fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  unreadLabel: { color: '#4f46e5', fontSize: 13, fontWeight: '600', marginBottom: 20 },

  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardUnread: {
    borderColor: '#4f46e5',
    backgroundColor: '#1a1a2e',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f46e5' },
  notifTitle: { color: 'white', fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
  notifBody: { color: '#aaa', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  notifTime: { color: '#555', fontSize: 12 },
  tapHint: { color: '#4f46e5', fontSize: 12, fontWeight: '600', marginTop: 6 },

  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtext: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});