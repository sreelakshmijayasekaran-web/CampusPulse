// app/index.tsx  ← replace your existing index.tsx with this

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { fetchEvents, Event } from '../firebase/eventService';
import { auth } from '../firebase/firebaseConfig';
import { logOut } from '../firebase/authService';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function HomeScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Watch auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  // Load events from Firestore
  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoadingEvents(false));
  }, []);

  const handleLogout = async () => {
    await logOut();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>CampusPulse</Text>

      {/* Auth buttons */}
      {user ? (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.buttonText}>Log Out</Text>
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

      <Text style={styles.subheading}>Upcoming Events</Text>

      {/* Organizer: show create button */}
      {user && (
        <Link href="/create-event" asChild>
          <TouchableOpacity style={styles.createButton}>
            <Text style={styles.buttonText}>＋ Create Event</Text>
          </TouchableOpacity>
        </Link>
      )}

      {/* Events list */}
      {loadingEvents ? (
        <ActivityIndicator color="#4f46e5" style={{ marginTop: 30 }} />
      ) : events.length === 0 ? (
        <Text style={styles.empty}>No events yet. Check back soon!</Text>
      ) : (
        events.map((event) => (
          <View key={event.id} style={styles.card}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.details}>📍 {event.venue}</Text>
            <Text style={styles.details}>🕒 {event.time}</Text>
            <Text style={styles.details}>🏷 {event.club}</Text>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingTop: 60, paddingHorizontal: 20 },
  heading: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  subheading: { fontSize: 18, color: '#bbbbbb', marginBottom: 20, marginTop: 10 },
  authRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginBottom: 10 },
  signupButton: { backgroundColor: '#22c55e', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  loginButton: { backgroundColor: '#4f46e5', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  logoutButton: { backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, alignSelf: 'flex-end', marginBottom: 10 },
  createButton: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  card: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 20, marginBottom: 20 },
  eventTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  details: { color: '#cccccc', fontSize: 16, marginBottom: 5 },
  button: { marginTop: 15, backgroundColor: '#4f46e5', padding: 12, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  empty: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 15 },
});