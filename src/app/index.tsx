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
  /* ---------------- EVENT CATEGORIES ---------------- */

const now = new Date();

const happeningToday = filteredEvents.filter((event) => {
  if (!event.time) return false;
  console.log(event.time);

  const eventDate = new Date(event.time);

  return (
    eventDate.toDateString() === now.toDateString()
  );
});

const upcomingEvents = filteredEvents.filter((event) => {
  if (!event.time?.includes('T')) return false;

  const eventDate = new Date(event.time);

  return eventDate > now;
});

const recentlyHappened = filteredEvents.filter((event) => {
  if (!event.time?.includes('T')) return false;

  const eventDate = new Date(event.time);

  return eventDate < now;
});
const trendingEvents = [...filteredEvents].sort(
  (a, b) =>
    (b.registeredUsers?.length || 0) -
    (a.registeredUsers?.length || 0)
);

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

      {/* ⚡ HAPPENING TODAY */}

<Text style={styles.subheading}>⚡ Happening Today</Text>

<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.posterRow}
>
  {happeningToday.map((event) => {
    const taken = event.registeredUsers?.length ?? 0;

    return (
      <TouchableOpacity
        key={event.id}
        style={styles.posterCard}
        onPress={() => router.push(`/event-details?id=${event.id}`)}
        activeOpacity={0.85}
      >

        {event.posterUrl ? (
          <Image
            source={{ uri: event.posterUrl }}
            style={styles.posterImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderEmoji}>📅</Text>
          </View>
        )}

        <View style={styles.posterBadge}>
          <Text style={styles.posterBadgeText}>LIVE</Text>
        </View>

        <View style={styles.posterInfo}>
          <Text style={styles.posterTitle} numberOfLines={2}>
            {event.title}
          </Text>

          <Text style={styles.posterSub}>
            🕒 {formatDateTime(event.time)}
          </Text>

          <Text style={styles.posterCount}>
            👥 {taken} registered
          </Text>
        </View>

      </TouchableOpacity>
    );
  })}
</ScrollView>


{/* 🚀 UPCOMING EVENTS */}

<Text style={styles.subheading}>🚀 Upcoming Events</Text>

<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.posterRow}
>
  {upcomingEvents.map((event) => {
    const taken = event.registeredUsers?.length ?? 0;

    return (
      <TouchableOpacity
        key={event.id}
        style={styles.posterCard}
        onPress={() => router.push(`/event-details?id=${event.id}`)}
        activeOpacity={0.85}
      >

        {event.posterUrl ? (
          <Image
            source={{ uri: event.posterUrl }}
            style={styles.posterImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderEmoji}>📅</Text>
          </View>
        )}

        <View style={styles.posterInfo}>
          <Text style={styles.posterTitle} numberOfLines={2}>
            {event.title}
          </Text>

          <Text style={styles.posterSub}>
            🕒 {formatDateTime(event.time)}
          </Text>

          <Text style={styles.posterCount}>
            👥 {taken} registered
          </Text>
        </View>

      </TouchableOpacity>
    );
  })}
</ScrollView>


{/* 🔥 TRENDING EVENTS */}

<Text style={styles.subheading}>🔥 Trending Events</Text>

<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.posterRow}
>
  {trendingEvents.map((event) => {
    const taken = event.registeredUsers?.length ?? 0;

    return (
      <TouchableOpacity
        key={event.id}
        style={styles.posterCard}
        onPress={() => router.push(`/event-details?id=${event.id}`)}
        activeOpacity={0.85}
      >

        {event.posterUrl ? (
          <Image
            source={{ uri: event.posterUrl }}
            style={styles.posterImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderEmoji}>📅</Text>
          </View>
        )}

        <View style={styles.posterBadge}>
          <Text style={styles.posterBadgeText}>TRENDING</Text>
        </View>

        <View style={styles.posterInfo}>
          <Text style={styles.posterTitle} numberOfLines={2}>
            {event.title}
          </Text>

          <Text style={styles.posterSub}>
            🕒 {formatDateTime(event.time)}
          </Text>

          <Text style={styles.posterCount}>
            🔥 {taken} registrations
          </Text>
        </View>

      </TouchableOpacity>
    );
  })}
</ScrollView>


{/* 🎉 RECENTLY HAPPENED */}

<Text style={styles.subheading}>🎉 Recently Happened</Text>

<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.posterRow}
>
  {recentlyHappened.map((event) => {

    return (
      <TouchableOpacity
        key={event.id}
        style={[styles.posterCard, { opacity: 0.7 }]}
        activeOpacity={1}
      >

        {event.posterUrl ? (
          <Image
            source={{ uri: event.posterUrl }}
            style={styles.posterImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderEmoji}>📅</Text>
          </View>
        )}

        <View
          style={[
            styles.posterBadge,
            { backgroundColor: '#111' }
          ]}
        >
          <Text style={styles.posterBadgeText}>
            ENDED
          </Text>
        </View>

        <View style={styles.posterInfo}>
          <Text style={styles.posterTitle} numberOfLines={2}>
            {event.title}
          </Text>

          <Text style={styles.posterSub}>
            Event completed
          </Text>

          <Text
            style={[
              styles.posterCount,
              { color: '#999' }
            ]}
          >
            Registration Closed
          </Text>
        </View>

      </TouchableOpacity>
    );
  })}
</ScrollView>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },

  notifButton: {
    position: 'relative',
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ff5a1f',
    borderRadius: 14,
  },

  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#111',
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
    width: 42,
  },

  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111',
    letterSpacing: 0.5,
  },

  welcomeText: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },

  authRow: {
    flexDirection: 'row',
    gap: 8,
  },

  signupButton: {
    backgroundColor: '#ff5a1f',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },

  loginButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },

  buttonText: {
    color: '#111',
    fontSize: 13,
    fontWeight: '700',
  },

  adminButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff5a1f',
    padding: 14,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 18,
  },

  adminButtonText: {
    color: '#ff5a1f',
    fontWeight: '700',
    fontSize: 15,
  },

  pendingNotice: {
    backgroundColor: '#fff4ed',
    borderWidth: 1,
    borderColor: '#ffb088',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },

  pendingText: {
    color: '#ff5a1f',
    fontSize: 13,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#ececec',
  },

  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: '#111',
    fontSize: 15,
    paddingVertical: 14,
  },

  clearBtn: {
    color: '#999',
    fontSize: 16,
    paddingLeft: 8,
  },

  categoryScroll: {
    marginBottom: 20,
  },

  categoryContent: {
    gap: 10,
    paddingRight: 8,
  },

  categoryTag: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ececec',
  },

  categoryTagActive: {
    backgroundColor: '#ff5a1f',
    borderColor: '#ff5a1f',
  },

  categoryText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },

  categoryTextActive: {
    color: 'white',
  },

  createButton: {
    backgroundColor: '#ff5a1f',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },

  subheading: {
    color: '#666',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 18,
  },

  posterRow: {
    paddingRight: 20,
    paddingBottom: 20,
    gap: 18,
  },

  posterCard: {
    width: 180,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ececec',
  },

  posterImage: {
    width: 180,
    height: 260,
  },

  posterPlaceholder: {
    width: 180,
    height: 260,
    backgroundColor: '#fff4ed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },

  posterPlaceholderEmoji: {
    fontSize: 42,
  },

  posterPlaceholderTitle: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },

  posterPlaceholderClub: {
    color: '#ff5a1f',
    fontSize: 12,
    textAlign: 'center',
  },

  posterBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#ff5a1f',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  posterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },

  posterFullBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#111',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  posterFullBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },

  posterInfo: {
    padding: 14,
    gap: 5,
  },

  posterTitle: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },

  posterSub: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },

  posterCount: {
    color: '#ff5a1f',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
  },

  emptyEmoji: {
    fontSize: 50,
    marginBottom: 14,
  },

  emptyText: {
    color: '#111',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },

  emptySubtext: {
    color: '#777',
    fontSize: 14,
  },
});