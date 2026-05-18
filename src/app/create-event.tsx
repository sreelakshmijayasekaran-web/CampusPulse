import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { createEvent, fetchEventById, updateEvent } from '../firebase/eventService';
import { auth, db } from '../firebase/firebaseConfig';

const CATEGORIES = ['Hackathon', 'Workshop', 'Seminar', 'Cultural', 'Sports', 'Other'];

export default function CreateEvent() {
  // If ?id=xxx is passed, we're in EDIT mode
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = !!editId;

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [time, setTime] = useState('');
  const [club, setClub] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [registerLink, setRegisterLink] = useState('');
  const [deadline, setDeadline] = useState('');
  const [seatLimit, setSeatLimit] = useState('');
  const [noLimit, setNoLimit] = useState(true);
  const [posterUri, setPosterUri] = useState<string | null>(null);       // local URI
  const [posterUrl, setPosterUrl] = useState<string | null>(null);       // remote URL (edit mode)
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'checking' | 'approved' | 'pending' | 'rejected'>('checking');

  // Check organizer approval + load event data if editing
  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) { router.replace('/login'); return; }

      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setStatus(snap.data().status);

      if (isEditMode && editId) {
        const event = await fetchEventById(editId);
        if (event) {
          setTitle(event.title ?? '');
          setVenue(event.venue ?? '');
          setTime(event.time ?? '');
          setClub(event.club ?? '');
          setCategory(event.category ?? '');
          setDescription(event.description ?? '');
          setRegisterLink(event.registerLink ?? '');
          setDeadline(event.deadline ?? '');
          if (event.seatLimit) {
            setSeatLimit(String(event.seatLimit));
            setNoLimit(false);
          } else {
            setNoLimit(true);
          }
          if (event.posterUrl) setPosterUrl(event.posterUrl);
        }
      }
    };
    init();
  }, []);

  // Pick image from gallery
  const pickImage = async () => {
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload a poster.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPosterUri(result.assets[0].uri);
      setPosterUrl(null); // clear old remote URL preview
    }
  };

  // Upload image to Firebase Storage, return download URL
  const uploadPoster = async (): Promise<string | null> => {
    if (!posterUri) return posterUrl; // no new image picked, keep existing
    setUploading(true);
    try {
      const response = await fetch(posterUri);
      const blob = await response.blob();
      const storage = getStorage();
      const storageRef = ref(storage, `event-posters/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      Alert.alert('Upload failed', 'Could not upload poster image.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !venue.trim() || !time.trim() || !club.trim() || !category) {
      Alert.alert('Missing fields', 'Please fill in all required fields and select a category.');
      return;
    }
    if (!noLimit && (!seatLimit || isNaN(Number(seatLimit)) || Number(seatLimit) < 1)) {
      Alert.alert('Invalid seat limit', 'Enter a valid number for seat limit.');
      return;
    }

    setLoading(true);
    try {
      const uploadedUrl = await uploadPoster();
      const eventData = {
        title,
        venue,
        time,
        club,
        category,
        description,
        registerLink,
        deadline,
        seatLimit: noLimit ? null : Number(seatLimit),
        posterUrl: uploadedUrl ?? null,
      };

      if (isEditMode && editId) {
        await updateEvent(editId, eventData);
        Alert.alert('Updated!', 'Event details have been updated.');
        router.back();
      } else {
        await createEvent(eventData);
        Alert.alert('Submitted!', '⏳ Admin will review and approve your event shortly.');
        router.replace('/');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading check
  if (status === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

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

  const previewImage = posterUri ?? posterUrl;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* HEADER */}
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backLink}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>{isEditMode ? 'Edit Event' : 'Create Event'}</Text>
      <View style={styles.approvedBadge}>
        <Text style={styles.approvedText}>✅ Approved Organizer</Text>
      </View>

      {/* POSTER UPLOAD */}
      <Text style={styles.label}>Event Poster</Text>
      <TouchableOpacity style={styles.posterPicker} onPress={pickImage}>
        {previewImage ? (
          <Image source={{ uri: previewImage }} style={styles.posterPreview} resizeMode="cover" />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterIcon}>🖼️</Text>
            <Text style={styles.posterPickerText}>Tap to upload poster (16:9)</Text>
            <Text style={styles.posterPickerSub}>JPG / PNG recommended</Text>
          </View>
        )}
      </TouchableOpacity>
      {previewImage && (
        <TouchableOpacity onPress={() => { setPosterUri(null); setPosterUrl(null); }}>
          <Text style={styles.removeImage}>✕ Remove image</Text>
        </TouchableOpacity>
      )}

      {/* BASIC FIELDS */}
      <Text style={styles.label}>Event Title *</Text>
      <TextInput placeholder="e.g. Hackathon 2026" placeholderTextColor="#555" style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Venue *</Text>
      <TextInput placeholder="e.g. Seminar Hall" placeholderTextColor="#555" style={styles.input} value={venue} onChangeText={setVenue} />

      <Text style={styles.label}>Date & Time *</Text>
      <TextInput placeholder="e.g. 10:00 AM, 14 Feb 2026" placeholderTextColor="#555" style={styles.input} value={time} onChangeText={setTime} />

      <Text style={styles.label}>Club / Organizer *</Text>
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

      {/* DEADLINE */}
      <Text style={styles.label}>Registration Deadline (optional)</Text>
      <TextInput
        placeholder="e.g. 12 Feb 2026, 11:59 PM"
        placeholderTextColor="#555"
        style={styles.input}
        value={deadline}
        onChangeText={setDeadline}
      />

      {/* SEAT LIMIT */}
      <Text style={styles.label}>Seat Limit</Text>
      <View style={styles.seatRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, noLimit && styles.toggleBtnActive]}
          onPress={() => setNoLimit(true)}
        >
          <Text style={[styles.toggleBtnText, noLimit && styles.toggleBtnTextActive]}>
            ∞ No Limit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, !noLimit && styles.toggleBtnActive]}
          onPress={() => setNoLimit(false)}
        >
          <Text style={[styles.toggleBtnText, !noLimit && styles.toggleBtnTextActive]}>
            Set Limit
          </Text>
        </TouchableOpacity>
      </View>
      {!noLimit && (
        <TextInput
          placeholder="e.g. 100"
          placeholderTextColor="#555"
          style={styles.input}
          value={seatLimit}
          onChangeText={setSeatLimit}
          keyboardType="number-pad"
        />
      )}

      {/* CATEGORY */}
      <Text style={styles.label}>Category *</Text>
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

      {!isEditMode && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            📋 Your event will be reviewed by admin before it appears publicly.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, (loading || uploading) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading || uploading}
      >
        {loading || uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>
            {uploading ? 'Uploading…' : isEditMode ? '💾 Save Changes' : 'Submit Event'}
          </Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', padding: 30 },

  backLink: { color: '#4f46e5', fontSize: 15, fontWeight: '600', marginBottom: 16 },
  heading: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 12 },
  approvedBadge: { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#22c55e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 24 },
  approvedText: { color: '#22c55e', fontSize: 13, fontWeight: '700' },

  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
  input: { backgroundColor: '#1e1e1e', color: 'white', padding: 15, borderRadius: 12, marginBottom: 20, fontSize: 15 },
  textArea: { height: 110, textAlignVertical: 'top' },

  // Poster
  posterPicker: { backgroundColor: '#1e1e1e', borderRadius: 14, overflow: 'hidden', marginBottom: 10, borderWidth: 1.5, borderColor: '#2a2a2a', borderStyle: 'dashed' },
  posterPreview: { width: '100%', height: 200 },
  posterPlaceholder: { height: 160, justifyContent: 'center', alignItems: 'center', gap: 8 },
  posterIcon: { fontSize: 36 },
  posterPickerText: { color: '#888', fontSize: 15, fontWeight: '600' },
  posterPickerSub: { color: '#555', fontSize: 12 },
  removeImage: { color: '#ef4444', fontSize: 13, fontWeight: '600', marginBottom: 20, textAlign: 'right' },

  // Seat toggle
  seatRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1e1e1e', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  toggleBtnActive: { backgroundColor: '#1e1b4b', borderColor: '#4f46e5' },
  toggleBtnText: { color: '#888', fontWeight: '600', fontSize: 14 },
  toggleBtnTextActive: { color: 'white' },

  // Category
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryTag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e1e1e', borderWidth: 1.5, borderColor: 'transparent' },
  categoryTagActive: { backgroundColor: '#1e1b4b', borderColor: '#4f46e5' },
  categoryText: { color: '#888', fontWeight: '600', fontSize: 13 },
  categoryTextActive: { color: 'white' },

  noticeBox: { backgroundColor: '#1a1500', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 12, padding: 14, marginBottom: 20 },
  noticeText: { color: '#f59e0b', fontSize: 13, lineHeight: 20 },

  button: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  blockedEmoji: { fontSize: 52, marginBottom: 16 },
  blockedTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  blockedText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  backBtn: { backgroundColor: '#1e1e1e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#4f46e5', fontWeight: '600', fontSize: 15 },
});