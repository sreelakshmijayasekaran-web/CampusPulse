// app/profile.tsx
// Restyled to match the CampusPulse home screen design system.
// - Gradient hero header with avatar, name, role badge
// - All users: "Events Participated" section
// - Organizers: additional "My Posted Events" section
// - All users: "Send Feedback" button

import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Gradients } from '../constants/theme';
import { Event, fetchMyEvents, fetchMyRegisteredEvents } from '../firebase/eventService';
import { auth, db } from '../firebase/firebaseConfig';

const ROLE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; text: string }> = {
  admin: { label: 'Admin', icon: 'shield-checkmark-outline', bg: '#FFE4E6', text: '#BE123C' },
  organizer: { label: 'Organizer', icon: 'briefcase-outline', bg: '#DBEAFE', text: '#1D4ED8' },
  student: { label: 'Student', icon: 'school-outline', bg: '#DCFCE7', text: '#15803D' },
};

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [postedEvents, setPostedEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { router.replace('/login'); return; }

        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);

          const registered = await fetchMyRegisteredEvents();
          setRegisteredEvents(registered);

          if (data.role === 'organizer') {
            const posted = await fetchMyEvents();
            setPostedEvents(posted);
          }
        }
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await auth.signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No user data found</Text>
      </View>
    );
  }

  const isOrganizer = userData.role === 'organizer';
  const approvedPosted = postedEvents.filter((e) => e.status === 'approved').length;
  const pendingPosted = postedEvents.filter((e) => e.status === 'pending').length;
  const roleMeta = ROLE_META[userData.role] ?? ROLE_META.student;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero header */}
      <LinearGradient colors={Gradients.light.sunrise} style={styles.heroPanel}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userData.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Your profile</Text>
            <Text style={styles.userName}>{userData.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleMeta.bg }]}>
              <Ionicons name={roleMeta.icon} size={13} color={roleMeta.text} />
              <Text style={[styles.roleBadgeText, { color: roleMeta.text }]}>{roleMeta.label}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Profile details card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="person-outline" size={18} color="#1D4ED8" />
          </View>
          <Text style={styles.cardTitle}>Account details</Text>
        </View>
        <ProfileRow icon="mail-outline" label="Email" value={userData.email} />
        <ProfileRow icon="call-outline" label="Phone" value={userData.phone || 'Not added'} />
        <ProfileRow icon="business-outline" label="Department" value={userData.department || 'Not added'} />
        <ProfileRow icon="ribbon-outline" label="Year" value={userData.year || 'Not added'} />
        <ProfileRow icon="school-outline" label="College" value={userData.college || 'Not added'} last />
      </View>

      {/* ── HISTORY SECTIONS ── */}

      {/* Organizer: My Posted Events */}
      {isOrganizer && (
        <HistoryCard
          icon="albums-outline"
          iconBg="#DBEAFE"
          iconColor="#1D4ED8"
          title="My Posted Events"
          subtitle={
            `${postedEvents.length} event${postedEvents.length !== 1 ? 's' : ''} submitted` +
            (approvedPosted > 0 ? ` · ${approvedPosted} approved` : '') +
            (pendingPosted > 0 ? ` · ${pendingPosted} pending` : '')
          }
          onPress={() => router.push('/my-events')}
        />
      )}

      {/* All users: Events Participated */}
      <HistoryCard
        icon="ticket-outline"
        iconBg="#DCFCE7"
        iconColor="#15803D"
        title="Events Participated"
        subtitle={
          registeredEvents.length > 0
            ? `${registeredEvents.length} event${registeredEvents.length !== 1 ? 's' : ''} registered`
            : 'No events registered yet'
        }
        onPress={() => router.push('/event-history')}
      />

      {/* ── ACTIONS ── */}

      <Text style={styles.groupLabel}>More</Text>

      <View style={styles.actionGroup}>
        <ActionRow
          icon="chatbubble-ellipses-outline"
          iconBg="#FEF3C7"
          iconColor="#B45309"
          label="Send Feedback"
          onPress={() => router.push('/feedback')}
        />
        <ActionRow
          icon="settings-outline"
          iconBg="#F1F5F9"
          iconColor="#475569"
          label="Settings"
          onPress={() => router.push('/settings')}
        />
        <ActionRow
          icon="help-circle-outline"
          iconBg="#F3E8FF"
          iconColor="#7E22CE"
          label="Help"
          onPress={() => router.push('/help')}
        />
        {userData.role === 'admin' && (
          <ActionRow
            icon="shield-checkmark-outline"
            iconBg="#FFE4E6"
            iconColor="#BE123C"
            label="Admin Panel"
            onPress={() => router.push('/admin')}
          />
        )}
        <ActionRow
          icon="log-out-outline"
          iconBg="#FEE2E2"
          iconColor={Colors.light.error}
          label="Log Out"
          labelColor={Colors.light.error}
          onPress={handleLogout}
          last
        />
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.profileRow, last && styles.noBorder]}>
      <View style={styles.profileLabelRow}>
        <Ionicons name={icon} size={15} color={Colors.light.textSecondary} />
        <Text style={styles.profileLabel}>{label}</Text>
      </View>
      <Text style={styles.profileValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function HistoryCard({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.historyCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.historyLeft}>
        <View style={[styles.historyIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.historyTitle}>{title}</Text>
          <Text style={styles.historySubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

function ActionRow({
  icon,
  iconBg,
  iconColor,
  label,
  labelColor,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  labelColor?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, last && styles.noBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.actionLabel, labelColor && { color: labelColor }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  emptyText: {
    color: Colors.light.text,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
  },

  // ── Hero ──
  heroPanel: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 26,
    fontFamily: 'Sora_700Bold',
  },
  eyebrow: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  userName: {
    color: Colors.light.text,
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
  },

  // ── Account details card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  noBorder: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  profileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileLabel: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontFamily: 'Sora_500Medium',
  },
  profileValue: {
    color: Colors.light.text,
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    maxWidth: '55%',
    textAlign: 'right',
  },

  // ── History cards ──
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    flex: 1,
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTitle: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    marginBottom: 2,
  },
  historySubtitle: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
  },

  // ── Action group ──
  groupLabel: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
    marginLeft: 4,
  },
  actionGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
  },
});