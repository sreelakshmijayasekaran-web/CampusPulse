import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/theme';

const FAQS = [
  {
    question: 'How do I register for an event?',
    answer: 'Open any event → Tap "View Details" → Press "Register Now" or mark interest.',
    icon: 'calendar-outline' as const,
    color: '#2563EB',
    bg: '#DBEAFE',
  },
  {
    question: "Why can't I create events?",
    answer: 'Only approved organizers can create events. Admin must approve your account first.',
    icon: 'lock-closed-outline' as const,
    color: '#DC2626',
    bg: '#FEE2E2',
  },
  {
    question: 'How do I become an organizer?',
    answer: 'Sign up as an organizer → Wait for admin approval → Once approved, start creating events.',
    icon: 'person-add-outline' as const,
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  {
    question: 'I forgot my password?',
    answer: 'Use the "Forgot Password" option on the login screen to reset your password via email.',
    icon: 'key-outline' as const,
    color: '#B45309',
    bg: '#FEF3C7',
  },
];

export default function Help() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO */}
      <LinearGradient colors={Gradients.light.sunrise} style={styles.heroPanel}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="radio-outline" size={24} color="white" />
          </View>
          <View>
            <Text style={styles.eyebrow}>Knowledge base</Text>
            <Text style={styles.heading}>CampusPulse</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>Help & Support</Text>
        <Text style={styles.heroSub}>
          Everything you need to know about managing campus events, registrations, and your account.
        </Text>

        {/* Stat chips */}
        <View style={styles.statsRow}>
          <StatChip icon="calendar-outline" label="Events" color="#2563EB" />
          <StatChip icon="people-outline" label="Community" color="#16A34A" />
          <StatChip icon="shield-checkmark-outline" label="Secure" color="#7C3AED" />
        </View>
      </LinearGradient>

      {/* ABOUT */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
          </View>
          <Text style={styles.cardTitle}>About CampusPulse</Text>
        </View>
        <Text style={styles.bodyText}>
          CampusPulse is a smart college event management app that helps students discover, register,
          and stay updated about campus events — hackathons, workshops, seminars, cultural programs, and sports.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.bodyText}>
          Organizers can create events and admins can manage approvals. Everything you need, in one colorful feed.
        </Text>
      </View>

      {/* CONTACT */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="person-circle-outline" size={20} color="#059669" />
          </View>
          <Text style={styles.cardTitle}>Contact & Support</Text>
        </View>

        <ContactRow
          icon="business-outline"
          label="Administrator"
          value="College Event Management Team"
          color="#2563EB"
          bg="#DBEAFE"
        />
        <View style={styles.divider} />
        <ContactRow
          icon="mail-outline"
          label="Support Email"
          value="support@campuspulse.edu"
          color="#059669"
          bg="#D1FAE5"
          onPress={() => Linking.openURL('mailto:support@campuspulse.edu')}
        />
        <View style={styles.divider} />
        <ContactRow
          icon="call-outline"
          label="Phone"
          value="+91 98765 43210"
          color="#7C3AED"
          bg="#EDE9FE"
          onPress={() => Linking.openURL('tel:+919876543210')}
        />
      </View>

      {/* FAQS */}
      <View style={styles.sectionHeader}>
        <View style={[styles.cardIcon, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="help-circle-outline" size={20} color="#B45309" />
        </View>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      </View>

      {FAQS.map((faq, i) => (
        <View key={i} style={styles.faqCard}>
          <View style={styles.faqHeader}>
            <View style={[styles.faqIcon, { backgroundColor: faq.bg }]}>
              <Ionicons name={faq.icon} size={16} color={faq.color} />
            </View>
            <Text style={styles.faqQuestion}>{faq.question}</Text>
          </View>
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
        </View>
      ))}

      {/* FOOTER */}
      <View style={styles.footer}>
        <Ionicons name="radio-outline" size={16} color={Colors.light.textSecondary} />
        <Text style={styles.footerText}>© 2026 CampusPulse · Built for college event management</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatChip({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function ContactRow({
  icon,
  label,
  value,
  color,
  bg,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  bg: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.contactRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.contactIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={[styles.contactValue, onPress && { color }]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward-outline" size={16} color={Colors.light.textSecondary} />}
    </Wrapper>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
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
  heroTitle: {
    color: Colors.light.text,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: 'Sora_700Bold',
    marginBottom: 8,
  },
  heroSub: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Sora_400Regular',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
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
    marginBottom: 14,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: Colors.light.text,
  },
  bodyText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Sora_400Regular',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },

  // CONTACT
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  contactValue: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: 'Sora_500Medium',
    marginTop: 2,
  },

  // FAQS
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  faqIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqQuestion: {
    color: Colors.light.text,
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  faqAnswer: {
    color: '#475569',
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    lineHeight: 20,
    paddingLeft: 42,
  },

  // FOOTER
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    marginBottom: 8,
  },
  footerText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    textAlign: 'center',
  },
});