import { router } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase/firebaseConfig';
import { Colors, Gradients } from '../constants/theme';

const CATEGORIES = ['General', 'Bug Report', 'Feature Request', 'UI/UX', 'Performance'];

const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  General: { icon: 'chatbubble-ellipses-outline', color: '#2563EB', bg: '#DBEAFE' },
  'Bug Report': { icon: 'bug-outline', color: '#DC2626', bg: '#FEE2E2' },
  'Feature Request': { icon: 'bulb-outline', color: '#B45309', bg: '#FEF3C7' },
  'UI/UX': { icon: 'color-palette-outline', color: '#7C3AED', bg: '#EDE9FE' },
  Performance: { icon: 'speedometer-outline', color: '#059669', bg: '#D1FAE5' },
};

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
const RATING_COLORS = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#16A34A'];

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
        status: 'unread',
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER HERO */}
      <LinearGradient colors={Gradients.light.sunrise} style={styles.heroPanel}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back-outline" size={20} color={Colors.light.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color="white" />
          </View>
          <View>
            <Text style={styles.eyebrow}>Share your thoughts</Text>
            <Text style={styles.heading}>App Feedback</Text>
          </View>
        </View>

        <Text style={styles.heroSub}>
          Help us make CampusPulse better — every bit of feedback counts.
        </Text>
      </LinearGradient>

      {/* STAR RATING */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="star-outline" size={18} color="#B45309" />
          </View>
          <Text style={styles.cardTitle}>Overall Rating</Text>
        </View>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
              <Ionicons
                name={rating >= star ? 'star' : 'star-outline'}
                size={38}
                color={rating >= star ? '#EAB308' : '#CBD5E1'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {rating > 0 && (
          <View style={[styles.ratingBadge, { backgroundColor: `${RATING_COLORS[rating]}18` }]}>
            <Ionicons name="checkmark-circle" size={14} color={RATING_COLORS[rating]} />
            <Text style={[styles.ratingLabel, { color: RATING_COLORS[rating] }]}>
              {RATING_LABELS[rating]}
            </Text>
          </View>
        )}
      </View>

      {/* CATEGORY */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="grid-outline" size={18} color="#7C3AED" />
          </View>
          <Text style={styles.cardTitle}>Category</Text>
        </View>

        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const isActive = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  { borderColor: isActive ? meta.color : Colors.light.border },
                  isActive && { backgroundColor: meta.bg },
                ]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={meta.icon}
                  size={14}
                  color={isActive ? meta.color : Colors.light.textSecondary}
                />
                <Text style={[styles.catChipText, isActive && { color: meta.color, fontFamily: 'Sora_700Bold' }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* MESSAGE */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="pencil-outline" size={18} color="#2563EB" />
          </View>
          <Text style={styles.cardTitle}>Your Message</Text>
        </View>

        <TextInput
          style={styles.textArea}
          placeholder="Tell us more about your experience..."
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={5}
          value={message}
          onChangeText={(t) => t.length <= 500 && setMessage(t)}
          textAlignVertical="top"
        />
        <View style={styles.charCountRow}>
          <Text style={styles.charCount}>{message.length} / 500</Text>
        </View>
      </View>

      {/* SUBMIT */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        <LinearGradient colors={Gradients.light.primary} style={styles.submitGradient}>
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="white" />
              <Text style={styles.submitText}>Submit Feedback</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
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
  },

  // HERO
  heroPanel: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backText: {
    color: Colors.light.primary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: 'Sora_700Bold',
    fontSize: 22,
    color: Colors.light.text,
  },
  heroSub: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Sora_400Regular',
  },

  // CARDS
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: Colors.light.text,
  },

  // RATING
  starsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13,
  },

  // CATEGORY
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  catChipText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    color: Colors.light.textSecondary,
  },

  // TEXTAREA
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    minHeight: 130,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  charCount: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
  },

  // SUBMIT
  submitBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
  },
  submitText: {
    color: 'white',
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
  },
});