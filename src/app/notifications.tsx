// app/notifications.tsx

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router } from 'expo-router';
import {
  collection, deleteDoc, doc, onSnapshot, orderBy,
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

// ──────────────────────────────────────────────────────────
// Swipeable row wrapper
// ──────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = -80;
const SWIPE_OUT_DISTANCE = -500;

function SwipeableRow({
  children,
  onDelete,
  disabled,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  disabled: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(1)).current; // 1 = full, animates to 0 on delete (interpolated)
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (disabled) return false;
        return Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderMove: (_, gesture) => {
        // Only allow swiping left (negative dx)
        const dx = Math.min(0, gesture.dx);
        translateX.setValue(dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < SWIPE_THRESHOLD) {
          // Animate fully off-screen, then collapse height, then call onDelete
          Animated.timing(translateX, {
            toValue: SWIPE_OUT_DISTANCE,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            Animated.timing(rowHeight, {
              toValue: 0,
              duration: 150,
              useNativeDriver: false,
            }).start(() => {
              onDelete();
            });
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        opacity: rowHeight,
        maxHeight: measuredHeight
          ? rowHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, measuredHeight + 10], // +10 ≈ marginBottom
            })
          : undefined,
      }}
      onLayout={(e) => {
        if (measuredHeight === null) setMeasuredHeight(e.nativeEvent.layout.height);
      }}
    >
      <View style={styles.swipeWrap}>
        {/* Delete background */}
        <View style={styles.deleteBackground}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteText}>Delete</Text>
        </View>

        <Animated.View
          style={{ transform: [{ translateX }] }}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  // Snapshot of which notifications were unread when the page first loaded.
  const [unreadSnapshotIds, setUnreadSnapshotIds] = useState<Set<string> | null>(null);

  // Multi-select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) { router.replace('/login'); return; }

    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notification, 'id'>) }));
      setNotifications(docs);
      setLoading(false);

      // On first load only, capture which ones are unread, then mark them
      // all as read in the background.
      if (unreadSnapshotIds === null) {
        const unreadIds = new Set(docs.filter((n) => !n.read).map((n) => n.id));
        setUnreadSnapshotIds(unreadIds);

        if (unreadIds.size > 0) {
          const batch = writeBatch(db);
          unreadIds.forEach((id) => batch.update(doc(db, 'notifications', id), { read: true }));
          batch.commit().catch(() => {
            // Non-fatal: if this fails, items will just show as unread next time
          });
        }
      }
    });

    return unsub;
  }, []);

  const handlePress = async (notif: Notification) => {
    if (selectMode) {
      toggleSelect(notif.id);
      return;
    }
    if (!notif.read) {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    }
    if (notif.eventId) router.push(`/event-details?id=${notif.eventId}`);
  };

  const handleLongPress = (notif: Notification) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([notif.id]));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSwipeDelete = async (id: string) => {
    // Optimistically remove from local state so the collapse animation feels instant
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch {
      // If deletion fails server-side, onSnapshot will resync and bring it back
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);

    // Optimistic UI update
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
    setSelectMode(false);

    try {
      const batch = writeBatch(db);
      idsToDelete.forEach((id) => batch.delete(doc(db, 'notifications', id)));
      await batch.commit();
    } catch {
      // onSnapshot will resync if this fails
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const filtered = notifications.filter((n) => matchesFilter(n, activeFilter));

  const allSelected = filtered.length > 0 && filtered.every((n) => selectedIds.has(n.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((n) => n.id)));
    }
  };

  // Split based on the snapshot taken at page-open time, not live `read` state
  const unreadList = filtered.filter((n) => unreadSnapshotIds?.has(n.id));
  const readList = filtered.filter((n) => !unreadSnapshotIds?.has(n.id));

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator color="#534AB7" size="large" />
        <Text style={styles.loadingText}>Loading notifications…</Text>
      </View>
    );
  }

  const renderCard = (notif: Notification, isUnreadSection: boolean) => {
    const meta = getMeta(notif.type);
    const timeStr = notif.createdAt?.toDate ? timeAgo(notif.createdAt.toDate()) : '';
    const isSelected = selectedIds.has(notif.id);

    const card = (
      <TouchableOpacity
        style={[
          styles.card,
          isUnreadSection && styles.cardUnread,
          isSelected && styles.cardSelected,
        ]}
        onPress={() => handlePress(notif)}
        onLongPress={() => handleLongPress(notif)}
        activeOpacity={0.75}
      >
        {isUnreadSection && !selectMode && <View style={styles.unreadAccent} />}

        <View style={styles.cardInner}>
          {selectMode && (
            <View style={styles.checkboxWrap}>
              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
            </View>
          )}

          <View style={[styles.iconAvatar, { backgroundColor: meta.bg }]}>
            <Text style={styles.iconEmoji}>{meta.icon}</Text>
          </View>

          <View style={styles.textBlock}>
            <View style={styles.cardTopRow}>
              <Text
                style={[styles.notifTitle, isUnreadSection && styles.notifTitleUnread]}
                numberOfLines={2}
              >
                {notif.title}
              </Text>
              {isUnreadSection && !selectMode && <View style={styles.unreadDot} />}
            </View>

            <Text style={styles.notifBody} numberOfLines={2}>
              {notif.body}
            </Text>

            <View style={styles.cardFooter}>
              {timeStr ? (
                <Text style={styles.timeText}>{timeStr}</Text>
              ) : null}
              {notif.eventId && !selectMode && (
                <Text style={[styles.tapHint, { color: meta.color }]}>
                  View event →
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );

    return (
      <SwipeableRow
        key={notif.id}
        disabled={selectMode}
        onDelete={() => handleSwipeDelete(notif.id)}
      >
        {card}
      </SwipeableRow>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Sticky header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {selectMode ? (
            <TouchableOpacity onPress={exitSelectMode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtn}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
          )}

          {filtered.length > 0 && (
            selectMode ? (
              <TouchableOpacity onPress={toggleSelectAll}>
                <Text style={styles.markAllBtn}>
                  {allSelected ? 'Deselect all' : 'Select all'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setSelectMode(true)}>
                <Text style={styles.markAllBtn}>Select</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>
            {selectMode ? `${selectedIds.size} selected` : 'Notifications'}
          </Text>
          {!selectMode && unreadList.length > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadList.length}</Text>
            </View>
          )}
        </View>

        {/* Filter pills */}
        {!selectMode && (
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
        )}

        <View style={styles.divider} />
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, selectMode && { paddingBottom: 96 }]}
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
          <>
            {unreadList.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>New</Text>
                {unreadList.map((n) => renderCard(n, true))}
              </>
            )}

            {readList.length > 0 && (
              <>
                {unreadList.length > 0 && (
                  <Text style={styles.sectionLabel}>Earlier</Text>
                )}
                {readList.map((n) => renderCard(n, false))}
              </>
            )}

            {!selectMode && (
              <Text style={styles.swipeHint}>Swipe left on a notification to delete it</Text>
            )}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ── Bottom action bar for select mode ── */}
      {selectMode && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.deleteSelectedBtn, selectedIds.size === 0 && styles.deleteSelectedBtnDisabled]}
            onPress={deleteSelected}
            disabled={selectedIds.size === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteIconBtn}>🗑️</Text>
            <Text style={styles.deleteSelectedText}>
              Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    opacity: 0.9,
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

  // ── Section labels ──
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#534AB7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },

  swipeHint: {
    fontSize: 12,
    color: '#BBB',
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Swipe wrapper ──
  swipeWrap: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 24,
    gap: 8,
    borderRadius: 14,
  },
  deleteIcon: {
    fontSize: 20,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
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
  cardSelected: {
    borderColor: '#534AB7',
    borderWidth: 1.5,
    backgroundColor: '#F0EEFC',
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

  // Checkbox
  checkboxWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D2CFEE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#534AB7',
    borderColor: '#534AB7',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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

  // ── Bottom action bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#EDEBF8',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 6,
  },
  deleteSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  deleteSelectedBtnDisabled: {
    backgroundColor: '#F3A8A8',
  },
  deleteIconBtn: {
    fontSize: 16,
  },
  deleteSelectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});