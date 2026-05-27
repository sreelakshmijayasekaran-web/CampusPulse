import { router } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, Platform,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';

const CATEGORIES = ['General', 'Bug Report', 'Feature Request', 'UI/UX', 'Performance'];

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return Alert.alert('Please select a rating');
    if (message.trim().length < 10)
      return Alert.alert('Please write at least 10 characters');

    try {
      setSubmitting(true);
      const user = auth.currentUser;

      // fetch user profile for name/role
      const snap = await getDoc(doc(db, 'users', user.uid));
      const userData = snap.exists() ? snap.data() : {};

      await addDoc(collection(db, 'feedback'), {
        uid: user?.uid ?? '',
        name: userData.name ?? '',
        email: user?.email ?? '',
        role: userData.role ?? 'student',
        department: userData.department ?? '',
        rating,
        category,
        message: message.trim(),
        platform: Platform.OS,
        appVersion: '1.0.0',
        status: 'unread',         // unread | reviewed | resolved
        createdAt: serverTimestamp(),
      });

      Alert.alert('Thank you!', 'Your feedback has been submitted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>App Feedback</Text>
      <Text style={styles.sub}>Help us improve your experience</Text>

      {/* Star Rating */}
      <Text style={styles.label}>Overall Rating</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={[styles.star, rating >= star && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingLabel}>
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
        </Text>
      )}

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, category === cat && styles.catChipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Message */}
      <Text style={styles.label}>Describe your feedback</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Tell us more..."
        placeholderTextColor="#555"
        multiline
        numberOfLines={5}
        value={message}
        onChangeText={(t) => t.length <= 500 && setMessage(t)}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{message.length} / 500</Text>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="white" />
          : <Text style={styles.submitText}>Submit Feedback</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 24, paddingTop: 50 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#818cf8', fontSize: 15 },
  heading: { color: 'white', fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  sub: { color: '#888', fontSize: 14, marginBottom: 28 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 10, marginTop: 8 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  star: { fontSize: 40, color: '#333' },
  starActive: { color: '#facc15' },
  ratingLabel: { color: '#facc15', fontSize: 13, marginBottom: 20 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a',
  },
  catChipActive: { backgroundColor: '#1e1b4b', borderColor: '#4f46e5' },
  catChipText: { color: '#888', fontSize: 13 },
  catChipTextActive: { color: '#818cf8', fontWeight: '700' },
  textArea: {
    backgroundColor: '#1e1e1e', borderRadius: 14, padding: 14,
    color: 'white', fontSize: 15, minHeight: 130,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  charCount: { color: '#555', fontSize: 12, textAlign: 'right', marginTop: 6, marginBottom: 24 },
  submitBtn: {
    backgroundColor: '#4f46e5', borderRadius: 14,
    padding: 16, alignItems: 'center', marginBottom: 40,
  },
  submitText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});