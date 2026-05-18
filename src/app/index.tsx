import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { doc, getDoc } from 'firebase/firestore';
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
      }
    });
    return unsub;
  }, []);

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

        {/* LEFT: App name + greeting */}
        <View>
          <Text style={styles.heading}>CampusPulse</Text>
          {user && userName && (
            <Text style={styles.welcomeText}>
              👋 Hey, {userName.split(' ')[0]}!
            </Text>
          )}
        </View>

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

      {/* CREATE EVENT */}
      {role === 'organizer' && userStatus === 'approved' && (
        <Link href="/create-event" asChild>
          <TouchableOpacity style={styles.createButton}>
            <Text style={styles.buttonText}>＋ Create Event</Text>
          </TouchableOpacity>
        </Link>
      )}

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
        filteredEvents.map((event) => (
          <View key={event.id} style={styles.card}>
            {event.category && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{event.category}</Text>
              </View>
            )}
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.details}>📍 {event.venue}</Text>
            <Text style={styles.details}>🕒 {event.time}</Text>
            <Text style={styles.details}>🏷 {event.club}</Text>
            {event.registeredUsers?.length > 0 && (
              <Text style={styles.interestedCount}>
                👥 {event.registeredUsers.length} students interested
              </Text>
            )}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => router.push(`/event-details?id=${event.id}`)}
            >
              <Text style={styles.buttonText}>View Details & Register →</Text>
            </TouchableOpacity>
          </View>
        ))
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

  rightHeader: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },

  welcomeText: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
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
    padding: 12,
    borderRadius: 12,
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

  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },

  badge: {
    backgroundColor: '#1e1b4b',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },

  badgeText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '700',
  },

  eventTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  details: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },

  interestedCount: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },

  registerButton: {
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
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