import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';

import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { Event, fetchEvents } from '../firebase/eventService';
import { auth, db } from '../firebase/firebaseConfig';

const CATEGORIES = ['All', 'Hackathon', 'Workshop', 'Seminar', 'Cultural', 'Sports', 'Other'];

export default function HomeScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
          setUserStatus(userDoc.data().status);
          setUserName(userDoc.data().name);
        }
      } else {
        setRole(null);
        setUserStatus(null);
        setUserName(null);
        setUnreadCount(0);
      }
    });
    return unsub;
  }, []);

  // Live unread notification count
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', auth.currentUser.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoadingEvents(false));
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.venue.toLowerCase().includes(search.toLowerCase()) ||
      event.club.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* HEADER */}
      <View style={styles.headerRow}>

        {/* LEFT: Notification bell */}
        <TouchableOpacity
          style={styles.notifButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={26} color="white" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* CENTER: App name + greeting */}
        <View style={styles.centerHeader}>
          <Text style={styles.heading}>CampusPulse</Text>
          {user && userName && (
            <Text style={styles.welcomeText}>
              👋 Hey, {userName.split(' ')[0]}!
            </Text>
          )}
        </View>
        {/* CREATE EVENT */}
      {role === 'organizer' && userStatus === 'approved' && (
        <Link href="/create-event" asChild>
          <TouchableOpacity style={styles.createButton}>
            <Text style={styles.buttonText}>＋ Create Event</Text>
          </TouchableOpacity>
        </Link>
      )}

        {/* RIGHT: Profile icon OR login/signup buttons */}
        <View style={styles.rightHeader}>
          {user ? (
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <Ionicons name="person-circle-outline" size={38} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={styles.authRow}>
              <Link href="/signup" asChild>
                <TouchableOpacity style={styles.signupButton}>
                  <Text style={styles.buttonText}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/login" asChild>
                <TouchableOpacity style={styles.loginButton}>
                  <Text style={styles.buttonText}>Log In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          )}
        </View>

      </View>

      {/* ADMIN */}
      {role === 'admin' && (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push('/admin')}
        >
          <Text style={styles.adminButtonText}>🛡 Admin Panel</Text>
        </TouchableOpacity>
      )}

      {/* PENDING */}
      {role === 'organizer' && userStatus === 'pending' && (
        <View style={styles.pendingNotice}>
          <Text style={styles.pendingText}>
            ⏳ Your organizer account is pending admin approval.
          </Text>
        </View>
      )}

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search events, venues, clubs..."
          placeholderTextColor="#555"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CATEGORY */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryTag, selectedCategory === cat && styles.categoryTagActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      

      <Text style={styles.subheading}>
        {selectedCategory === 'All' ? 'Upcoming Events' : selectedCategory}
        {search.length > 0 ? ` · "${search}"` : ''}
      </Text>

      {/* EVENTS */}
      {loadingEvents ? (
        <ActivityIndicator color="#4f46e5" style={{ marginTop: 30 }} />
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🔎</Text>
          <Text style={styles.emptyText}>No events found</Text>
          <Text style={styles.emptySubtext}>Try a different search or category</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.posterRow}
        >
          {filteredEvents.map((event) => {
            const taken = event.registeredUsers?.length ?? 0;
            const isFull = event.seatLimit != null && taken >= event.seatLimit;
            return (
              <TouchableOpacity
                key={event.id}
                style={styles.posterCard}
                onPress={() => router.push(`/event-details?id=${event.id}`)}
                activeOpacity={0.85}
              >
                {/* Poster image or placeholder */}
                {event.posterUrl ? (
                  <Image
                    source={{ uri: event.posterUrl }}
                    style={styles.posterImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.posterPlaceholder}>
                    <Text style={styles.posterPlaceholderEmoji}>📅</Text>
                    <Text style={styles.posterPlaceholderTitle} numberOfLines={3}>
                      {event.title}
                    </Text>
                    <Text style={styles.posterPlaceholderClub} numberOfLines={1}>
                      {event.club}
                    </Text>
                  </View>
                )}

                {/* Category badge overlay on top-left */}
                {event.category ? (
                  <View style={styles.posterBadge}>
                    <Text style={styles.posterBadgeText}>{event.category}</Text>
                  </View>
                ) : null}

                {/* Full badge on top-right */}
                {isFull ? (
                  <View style={styles.posterFullBadge}>
                    <Text style={styles.posterFullBadgeText}>FULL</Text>
                  </View>
                ) : null}

                {/* Info below poster */}
                <View style={styles.posterInfo}>
                  <Text style={styles.posterTitle} numberOfLines={2}>{event.title}</Text>
                  <Text style={styles.posterSub} numberOfLines={1}>🕒 {event.time}</Text>
                  {taken > 0 && (
                    <Text style={styles.posterCount}>👥 {taken} registered</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  // Notification bell
  notifButton: {
    position: 'relative',
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },

  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },

  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },

  centerHeader: {
    flex: 1,
    alignItems: 'center',
  },

  rightHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
  },

  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },

  welcomeText: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },

  authRow: {
    flexDirection: 'row',
    gap: 8,
  },

  signupButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },

  loginButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },

  buttonText: {
    color: 'white',
    fontSize: 14,
    marginTop: -10,
    fontWeight: 'bold',
  },

  adminButton: {
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#4f46e5',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },

  adminButtonText: {
    color: '#818cf8',
    fontWeight: '700',
    fontSize: 15,
  },

  pendingNotice: {
    backgroundColor: '#2a1f00',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },

  pendingText: {
    color: '#f59e0b',
    fontSize: 13,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },

  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    paddingVertical: 12,
  },

  clearBtn: {
    color: '#666',
    fontSize: 16,
    paddingLeft: 8,
  },

  categoryScroll: {
    marginBottom: 16,
  },

  categoryContent: {
    gap: 8,
    paddingRight: 8,
  },

  categoryTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
  },

  categoryTagActive: {
    backgroundColor: '#4f46e5',
  },

  categoryText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 13,
  },

  categoryTextActive: {
    color: 'white',
  },

  createButton: {
    backgroundColor: '#22c55e',
    marginTop:15,
    padding: 12,
    height:12,
    width:130,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },

  subheading: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Poster card row
  posterRow: {
    paddingRight: 20,
    paddingBottom: 20,
    gap: 14,
  },

  posterCard: {
    width: 160,
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    overflow: 'hidden',
  },

  posterImage: {
    width: 160,
    height: 220,
  },

  posterPlaceholder: {
    width: 160,
    height: 220,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },

  posterPlaceholderEmoji: {
    fontSize: 32,
  },

  posterPlaceholderTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },

  posterPlaceholderClub: {
    color: '#818cf8',
    fontSize: 11,
    textAlign: 'center',
  },

  posterBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(79,70,229,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  posterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },

  posterFullBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  posterFullBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },

  posterInfo: {
    padding: 10,
    gap: 3,
  },

  posterTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 18,
  },

  posterSub: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },

  posterCount: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
  },

  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },

  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
});