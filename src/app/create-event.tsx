// app/create-event.tsx  ← replace your existing create-event.tsx with this

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { createEvent } from '../firebase/eventService';

export default function CreateEvent() {
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [time, setTime] = useState('');
  const [club, setClub] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateEvent = async () => {
    if (!title.trim() || !venue.trim() || !time.trim() || !club.trim()) {
      alert('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await createEvent(title, venue, time, club);
      alert('Event Created! 🎉');
      router.replace('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Create Event</Text>

      <TextInput placeholder="Event Title" placeholderTextColor="#888" style={styles.input} value={title} onChangeText={setTitle} />
      <TextInput placeholder="Venue" placeholderTextColor="#888" style={styles.input} value={venue} onChangeText={setVenue} />
      <TextInput placeholder="Time  e.g. 10:00 AM" placeholderTextColor="#888" style={styles.input} value={time} onChangeText={setTime} />
      <TextInput placeholder="Club / Organizer" placeholderTextColor="#888" style={styles.input} value={club} onChangeText={setClub} />

      <TouchableOpacity style={styles.button} onPress={handleCreateEvent} disabled={loading}>
        {loading
          ? <ActivityIndicator color="white" />
          : <Text style={styles.buttonText}>Create Event</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, justifyContent: 'center' },
  heading: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 30 },
  input: { backgroundColor: '#1e1e1e', color: 'white', padding: 15, borderRadius: 12, marginBottom: 15 },
  button: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 5 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});