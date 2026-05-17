// app/create-event.tsx

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { createEvent } from '../firebase/eventService';

const CATEGORIES = ['Hackathon', 'Workshop', 'Seminar', 'Cultural', 'Sports', 'Other'];

export default function CreateEvent() {
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [time, setTime] = useState('');
  const [club, setClub] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [registerLink, setRegisterLink] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateEvent = async () => {
    if (!title.trim() || !venue.trim() || !time.trim() || !club.trim() || !category) {
      alert('Please fill in all fields and select a category.');
      return;
    }
    setLoading(true);
    try {
      await createEvent(title, venue, time, club, category, description, registerLink);
      alert('Event Created! 🎉');
      router.replace('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Create Event</Text>

      <Text style={styles.label}>Event Title</Text>
      <TextInput placeholder="e.g. Hackathon 2026" placeholderTextColor="#555" style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Venue</Text>
      <TextInput placeholder="e.g. Seminar Hall" placeholderTextColor="#555" style={styles.input} value={venue} onChangeText={setVenue} />

      <Text style={styles.label}>Time</Text>
      <TextInput placeholder="e.g. 10:00 AM, 14 Feb 2026" placeholderTextColor="#555" style={styles.input} value={time} onChangeText={setTime} />

      <Text style={styles.label}>Club / Organizer</Text>
      <TextInput placeholder="e.g. IEDC, CSE Dept" placeholderTextColor="#555" style={styles.input} value={club} onChangeText={setClub} />

      <Text style={styles.label}>Description</Text>
      <TextInput
        placeholder="Tell students what this event is about..."
        placeholderTextColor="#555"
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Registration Link (optional)</Text>
      <TextInput
        placeholder="https://forms.google.com/..."
        placeholderTextColor="#555"
        style={styles.input}
        value={registerLink}
        onChangeText={setRegisterLink}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryTag, category === cat && styles.categoryTagActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleCreateEvent} disabled={loading}>
        {loading
          ? <ActivityIndicator color="white" />
          : <Text style={styles.buttonText}>Create Event</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  heading: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 28 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { backgroundColor: '#1e1e1e', color: 'white', padding: 15, borderRadius: 12, marginBottom: 20, fontSize: 15 },
  textArea: { height: 110, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  categoryTag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e1e1e', borderWidth: 1.5, borderColor: 'transparent' },
  categoryTagActive: { backgroundColor: '#1e1b4b', borderColor: '#4f46e5' },
  categoryText: { color: '#888', fontWeight: '600', fontSize: 13 },
  categoryTextActive: { color: 'white' },
  button: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});