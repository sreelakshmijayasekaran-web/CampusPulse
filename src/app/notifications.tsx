// app/notifications.tsx

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
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

type FilterTab = 'All' | 'Events' | 'Deadlines' | 'Updates';

const FILTERS: FilterTab[] = ['All', 'Events', 'Deadlines', 'Updates'];

// Map notification type → icon character + accent color
const TYPE_META: Record<string, { icon: string; bg: string; color: string }> = {
  event:    { icon: '📅', bg: '#EDE9FF', color: '#534AB7' },
  deadline: { icon: '⏰', bg: '#FEF3C7', color: '#92400E' },
  update:   { icon: '📣', bg: '#DCFCE7', color: '#166534' },
  approval: { icon: '✅', bg: '#DCFCE7', color: '#166534' },
  reminder: { icon: '🔔', bg: '#FEE2E2', color: '#991B1B' },
  default:  { icon: '💬', bg: '#E0F2FE', color: '#0C4A6E' },
};

function getMeta(type?: string) {
  if (!type) return TYPE_META.default;
  const key = Object.keys(TYPE_META).find((k) => type.toLowerCase().includes(k));
  return key ? TYPE_META[key] : TYPE_META.default;
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function matchesFilter(notif: Notification, filter: FilterTab): boolean {
  if (filter === 'All') return true;
  const t = (notif.type ?? '').toLowerCase();
  if (filter === 'Events')    return t.includes('event') || !!notif.eventId;
  if (filter === 'Deadlines') return t.includes('deadline') || t.includes('reminder');
  if (filter === 'Updates')   return t.includes('update') || t.includes('approval') || t.includes('announce');
  return true;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

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
  const filtered = notifications.filter((n) => matchesFilter(n, activeFilter));

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator color="#534AB7" size="large" />
        <Text style={styles.loadingText}>Loading notifications…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Sticky header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markAllBtn}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[styles.pill, activeFilter === f && styles.pillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, activeFilter === f && styles.pillTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.divider} />
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>🔔</Text>
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'All'
                ? "You'll see event alerts and updates here."
                : `No ${activeFilter.toLowerCase()} notifications yet.`}
            </Text>
          </View>
        ) : (
          filtered.map((notif, idx) => {
            const meta = getMeta(notif.type);
            const timeStr = notif.createdAt?.toDate ? timeAgo(notif.createdAt.toDate()) : '';
            const isLast = idx === filtered.length - 1;

            return (
              <TouchableOpacity
                key={notif.id}
                style={[
                  styles.card,
                  !notif.read && styles.cardUnread,
                  isLast && { marginBottom: 0 },
                ]}
                onPress={() => handlePress(notif)}
                activeOpacity={0.75}
              >
                {/* Unread left accent bar */}
                {!notif.read && <View style={styles.unreadAccent} />}

                <View style={styles.cardInner}>
                  {/* Icon avatar */}
                  <View style={[styles.iconAvatar, { backgroundColor: meta.bg }]}>
                    <Text style={styles.iconEmoji}>{meta.icon}</Text>
                  </View>

                  {/* Text block */}
                  <View style={styles.textBlock}>
                    <View style={styles.cardTopRow}>
                      <Text
                        style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]}
                        numberOfLines={2}
                      >
                        {notif.title}
                      </Text>
                      {!notif.read && <View style={styles.unreadDot} />}
                    </View>

                    <Text style={styles.notifBody} numberOfLines={2}>
                      {notif.body}
                    </Text>

                    <View style={styles.cardFooter}>
                      {timeStr ? (
                        <Text style={styles.timeText}>{timeStr}</Text>
                      ) : null}
                      {notif.eventId && (
                        <Text style={[styles.tapHint, { color: meta.color }]}>
                          View event →
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  centered: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },

  // ── Header ──
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    color: '#534AB7',
    fontSize: 15,
    fontWeight: '600',
  },
  markAllBtn: {
    color: '#534AB7',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.75,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F0E1A',
    letterSpacing: -0.5,
  },
  unreadBadge: {
    backgroundColor: '#534AB7',
    borderRadius: 20,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Filter pills ──
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0DFF0',
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#534AB7',
    borderColor: '#534AB7',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E8E6F0',
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingTop: 12,
  },

  // ── Cards ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDEBF8',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardUnread: {
    backgroundColor: '#F5F3FF',
    borderColor: '#C4C0EC',
  },
  unreadAccent: {
    width: 3,
    backgroundColor: '#534AB7',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },

  // Icon avatar
  iconAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 20,
  },

  // Text
  textBlock: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  notifTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    lineHeight: 20,
  },
  notifTitleUnread: {
    fontWeight: '700',
    color: '#0F0E1A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#534AB7',
    marginTop: 6,
    flexShrink: 0,
  },
  notifBody: {
    fontSize: 13,
    color: '#888',
    lineHeight: 19,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#ABABAB',
    fontWeight: '500',
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Empty state ──
  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDE9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F0E1A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
});