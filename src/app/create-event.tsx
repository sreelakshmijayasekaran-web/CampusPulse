// app/create-event.tsx

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { createEvent } from '../firebase/eventService';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

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
  const [status, setStatus] = useState<'checking' | 'approved' | 'pending' | 'rejected'>('checking');

  // Check if this organizer is approved
  useEffect(() => {
    const check = async () => {
      const user = auth.currentUser;
      if (!user) { router.replace('/login'); return; }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setStatus(snap.data().status);
      }
    };
    check();
  }, []);

  const handleCreateEvent = async () => {
    if (!title.trim() || !venue.trim() || !time.trim() || !club.trim() || !category) {
      alert('Please fill in all fields and select a category.');
      return;
    }
    setLoading(true);
    try {
      await createEvent(title, venue, time, club, category, description, registerLink);
      alert('Event submitted! ⏳ Admin will review and approve it shortly.');
      router.replace('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Still checking
  if (status === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  // Pending approval
  if (status === 'pending') {
    return (
      <View style={styles.centered}>
        <Text style={styles.blockedEmoji}>⏳</Text>
        <Text style={styles.blockedTitle}>Approval Pending</Text>
        <Text style={styles.blockedText}>
          Your organizer account is waiting for admin approval.{'\n'}
          You'll be able to post events once approved.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Rejected
  if (status === 'rejected') {
    return (
      <View style={styles.centered}>
        <Text style={styles.blockedEmoji}>❌</Text>
        <Text style={styles.blockedTitle}>Request Rejected</Text>
        <Text style={styles.blockedText}>
          Your organizer request was not approved.{'\n'}
          Please contact the admin for more info.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Approved — show the form
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Create Event</Text>
      <View style={styles.approvedBadge}>
        <Text style={styles.approvedText}>✅ Approved Organizer</Text>
      </View>

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

      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          📋 Your event will be reviewed by admin before it appears publicly.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleCreateEvent} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Submit Event</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', padding: 30 },
  heading: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 12 },
  approvedBadge: { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#22c55e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 24 },
  approvedText: { color: '#22c55e', fontSize: 13, fontWeight: '700' },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { backgroundColor: '#1e1e1e', color: 'white', padding: 15, borderRadius: 12, marginBottom: 20, fontSize: 15 },
  textArea: { height: 110, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryTag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e1e1e', borderWidth: 1.5, borderColor: 'transparent' },
  categoryTagActive: { backgroundColor: '#1e1b4b', borderColor: '#4f46e5' },
  categoryText: { color: '#888', fontWeight: '600', fontSize: 13 },
  categoryTextActive: { color: 'white' },
  noticeBox: { backgroundColor: '#1a1500', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 12, padding: 14, marginBottom: 20 },
  noticeText: { color: '#f59e0b', fontSize: 13, lineHeight: 20 },
  button: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  blockedEmoji: { fontSize: 52, marginBottom: 16 },
  blockedTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  blockedText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  backBtn: { backgroundColor: '#1e1e1e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#4f46e5', fontWeight: '600', fontSize: 15 },
});