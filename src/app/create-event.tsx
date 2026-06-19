// app/create-event.tsx
// Key addition: after createEvent(), broadcast notification to all students.

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
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
import { Colors, Gradients } from '../constants/theme';
import { createEvent, fetchEventById, updateEvent } from '../firebase/eventService';
import { auth, db } from '../firebase/firebaseConfig';

const CATEGORIES = ['Hackathon', 'Workshop', 'Seminar', 'Cultural', 'Sports', 'Other'];

export default function CreateEvent() {
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = !!editId;

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [club, setClub] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [requiresRegistration, setRequiresRegistration] = useState(true);
  const [registerLink, setRegisterLink] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [seatLimit, setSeatLimit] = useState('');
  const [noLimit, setNoLimit] = useState(true);
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingLinkDescription, setMeetingLinkDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const CLOUDINARY_CLOUD_NAME = 'dweb7pnto';
  const CLOUDINARY_UPLOAD_PRESET = 'event_posters';
  const [status, setStatus] = useState<'checking' | 'approved' | 'pending' | 'rejected'>('checking');

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
          if (event.time?.includes('T')) {
            const [savedDate, savedTime] = event.time.split('T');
            setDate(savedDate);
            setTime(savedTime);
          } else {
            setTime(event.time ?? '');
          }
          setClub(event.club ?? '');
          setCategory(event.category ?? '');
          setDescription(event.description ?? '');
          setRequiresRegistration(event.requiresRegistration ?? true);
          setRegisterLink(event.registerLink ?? '');
          setDeadlineDate(event.deadlineDate ?? '');
          setDeadlineTime(event.deadlineTime ?? '');
          if (event.seatLimit) {
            setSeatLimit(String(event.seatLimit));
            setNoLimit(false);
          } else {
            setNoLimit(true);
          }
          setMeetingLink(event.meetingLink ?? '');
          setMeetingLinkDescription(event.meetingLinkDescription ?? '');
          if (event.posterUrl) setPosterUrl(event.posterUrl ?? '');
        }
      }
    };
    init();
  }, []);

  const pickAndUploadImage = async () => {
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload a poster.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const formData = new FormData();
      if (asset.file) {
        formData.append('file', asset.file);
      } else {
        formData.append('file', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: 'poster.jpg',
        } as any);
      }
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } }
      );
      const data = await res.json();
      if (data.secure_url) {
        setPosterUrl(data.secure_url);
      } else {
        Alert.alert('Upload failed', data.error?.message ?? 'Unknown error from Cloudinary.');
      }
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Check your internet connection.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !title.trim() ||
      !venue.trim() ||
      !date.trim() ||
      !time.trim() ||
      !club.trim() ||
      !category
    ) {
      Alert.alert('Missing fields', 'Please fill in all required fields and select a category.');
      return;
    }
    if (requiresRegistration && !noLimit && (!seatLimit || isNaN(Number(seatLimit)) || Number(seatLimit) < 1)) {
      Alert.alert('Invalid seat limit', 'Enter a valid number for seat limit.');
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        title,
        venue,
        time: `${date}T${time}`,
        club,
        category,
        description,
        requiresRegistration,
        registerLink: requiresRegistration ? registerLink : null,
        deadlineDate: requiresRegistration ? deadlineDate : null,
        deadlineTime: requiresRegistration ? deadlineTime : null,
        seatLimit: requiresRegistration && !noLimit ? Number(seatLimit) : null,
        meetingLink: meetingLink.trim() || null,
        meetingLinkDescription: meetingLinkDescription.trim() || null,
        posterUrl: posterUrl.trim() || null,

        isApproved: false,
        status: 'pending',
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

  if (status === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.light.primary} size="large" />
      </View>
    );
  }

  if (status === 'pending') {
    return (
      <View style={styles.centered}>
        <View style={styles.blockedIcon}>
          <Ionicons name="time-outline" size={32} color="#B45309" />
        </View>
        <Text style={styles.blockedTitle}>Approval Pending</Text>
        <Text style={styles.blockedText}>
          Your organizer account is waiting for admin approval.{'\n'}
          You'll be able to post events once approved.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'rejected') {
    return (
      <View style={styles.centered}>
        <View style={[styles.blockedIcon, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="close-circle-outline" size={32} color="#DC2626" />
        </View>
        <Text style={styles.blockedTitle}>Request Rejected</Text>
        <Text style={styles.blockedText}>
          Your organizer request was not approved.{'\n'}
          Please contact the admin for more info.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      <LinearGradient colors={Gradients.light.sunrise} style={styles.heroPanel}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={18} color={Colors.light.text} />
          <Text style={styles.backLink}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>{isEditMode ? 'Edit Event' : 'Create Event'}</Text>

        <View style={styles.approvedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#15803D" />
          <Text style={styles.approvedText}>Approved Organizer</Text>
        </View>
      </LinearGradient>

      <View style={styles.formCard}>

        {/* POSTER UPLOAD */}
        <Text style={styles.label}>Event Poster</Text>
        <TouchableOpacity style={styles.posterPicker} onPress={pickAndUploadImage} disabled={uploading} activeOpacity={0.85}>
          {uploading ? (
            <View style={styles.posterPlaceholder}>
              <ActivityIndicator color={Colors.light.primary} size="large" />
              <Text style={styles.posterPickerText}>Uploading...</Text>
            </View>
          ) : posterUrl ? (
            <Image source={{ uri: posterUrl }} style={styles.posterPreview} resizeMode="cover" />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Ionicons name="image-outline" size={32} color={Colors.light.primary} />
              <Text style={styles.posterPickerText}>Tap to upload poster</Text>
              <Text style={styles.posterPickerSub}>JPG / PNG recommended</Text>
            </View>
          )}
        </TouchableOpacity>
        {posterUrl ? (
          <TouchableOpacity onPress={() => setPosterUrl('')}>
            <Text style={styles.removeImage}>✕ Remove image</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.label}>Event Title *</Text>
        <TextInput placeholder="e.g. Hackathon 2026" placeholderTextColor="#94A3B8" style={styles.input} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Venue *</Text>
        <TextInput placeholder="e.g. Seminar Hall" placeholderTextColor="#94A3B8" style={styles.input} value={venue} onChangeText={setVenue} />

        <Text style={styles.label}>Event Date *</Text>
        <TextInput
          placeholder="2026-05-27"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={date}
          onChangeText={setDate}
        />

        <Text style={styles.label}>Event Time *</Text>
        <TextInput
          placeholder="HH:MM (24 hours)"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={time}
          onChangeText={setTime}
        />

        <Text style={styles.label}>Club / Organizer *</Text>
        <TextInput placeholder="e.g. IEDC, CSE Dept" placeholderTextColor="#94A3B8" style={styles.input} value={club} onChangeText={setClub} />

        <Text style={styles.label}>Description</Text>
        <TextInput
          placeholder="Tell students what this event is about..."
          placeholderTextColor="#94A3B8"
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* REGISTRATION TOGGLE */}
        <Text style={styles.label}>Registration</Text>
        <View style={styles.seatRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, requiresRegistration && styles.toggleBtnActive]}
            onPress={() => setRequiresRegistration(true)}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleBtnText, requiresRegistration && styles.toggleBtnTextActive]}>
              Required
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, !requiresRegistration && styles.toggleBtnActive]}
            onPress={() => setRequiresRegistration(false)}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleBtnText, !requiresRegistration && styles.toggleBtnTextActive]}>
              Open to All
            </Text>
          </TouchableOpacity>
        </View>
        {!requiresRegistration && (
          <Text style={styles.helperText}>
            Anyone can view this event — no sign-up needed. Seat limit, registration link, and deadline are hidden.
          </Text>
        )}

        {/* REGISTRATION-ONLY FIELDS */}
        {requiresRegistration && (
          <>
            <Text style={styles.label}>Registration Link</Text>
            <TextInput
              placeholder="https://forms.google.com/..."
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={registerLink}
              onChangeText={setRegisterLink}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.label}>Registration Deadline Date</Text>
            <TextInput
              placeholder="2026-05-27"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={deadlineDate}
              onChangeText={setDeadlineDate}
            />

            <Text style={styles.label}>Registration Deadline Time</Text>
            <TextInput
              placeholder="HH:MM (24 hours)"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={deadlineTime}
              onChangeText={setDeadlineTime}
            />

            <Text style={styles.label}>Seat Limit</Text>
            <View style={styles.seatRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, noLimit && styles.toggleBtnActive]}
                onPress={() => setNoLimit(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.toggleBtnText, noLimit && styles.toggleBtnTextActive]}>∞ No Limit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !noLimit && styles.toggleBtnActive]}
                onPress={() => setNoLimit(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.toggleBtnText, !noLimit && styles.toggleBtnTextActive]}>Set Limit</Text>
              </TouchableOpacity>
            </View>
            {!noLimit && (
              <TextInput
                placeholder="e.g. 100"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={seatLimit}
                onChangeText={setSeatLimit}
                keyboardType="number-pad"
              />
            )}
          </>
        )}

        {/* MEETING LINK (independent of registration mode) */}
        <Text style={styles.label}>Meeting Link (optional)</Text>
        <TextInput
          placeholder="https://meet.google.com/..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={meetingLink}
          onChangeText={setMeetingLink}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>About the Link</Text>
        <TextInput
          placeholder="e.g. Join 10 mins early, use your college email"
          placeholderTextColor="#94A3B8"
          style={[styles.input, styles.textArea]}
          value={meetingLinkDescription}
          onChangeText={setMeetingLinkDescription}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryTag, category === cat && styles.categoryTagActive]}
              onPress={() => setCategory(cat)}
              activeOpacity={0.85}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!isEditMode && (
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle-outline" size={16} color="#B45309" />
            <Text style={styles.noticeText}>
              Your event will be reviewed by admin before it appears publicly.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading || uploading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={Gradients.light.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.buttonGradient, (loading || uploading) && styles.buttonDisabled]}
          >
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="white" />
                <Text style={styles.buttonText}>Submitting…</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>
                {isEditMode ? 'Save Changes' : 'Submit for Review →'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  heroPanel: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backLink: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
  heading: {
    color: Colors.light.text,
    fontSize: 28,
    fontFamily: 'Sora_700Bold',
    marginBottom: 12,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  approvedText: {
    color: '#15803D',
    fontSize: 12,
    fontFamily: 'Sora_700Bold',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  label: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
    marginBottom: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: Colors.light.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textArea: { height: 110, textAlignVertical: 'top' },
  posterPicker: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  posterPreview: { width: '100%', height: 200 },
  posterPlaceholder: { height: 160, justifyContent: 'center', alignItems: 'center', gap: 8 },
  posterPickerText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
  posterPickerSub: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
  },
  removeImage: {
    color: Colors.light.error,
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    marginBottom: 20,
    textAlign: 'right',
  },
  seatRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  toggleBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: Colors.light.primary,
  },
  toggleBtnText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    textAlign: 'center',
  },
  toggleBtnTextActive: { color: Colors.light.primary },
  helperText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    marginTop: -8,
    marginBottom: 16,
    lineHeight: 18,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryTag: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  categoryTagActive: {
    backgroundColor: '#EEF2FF',
    borderColor: Colors.light.primary,
  },
  categoryText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
  },
  categoryTextActive: { color: Colors.light.primary },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  noticeText: {
    color: '#92400E',
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
    flex: 1,
    lineHeight: 18,
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
  },
  blockedIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  blockedTitle: {
    color: Colors.light.text,
    fontSize: 22,
    fontFamily: 'Sora_700Bold',
    marginBottom: 12,
  },
  blockedText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  backBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: Colors.light.primary,
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
  },
});