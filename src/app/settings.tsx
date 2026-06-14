import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { Colors, Gradients } from '../constants/theme';

export default function Settings() {
  const user = auth.currentUser;

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setPwLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user!.email!, currentPassword);
      await reauthenticateWithCredential(user!, credential);
      await updatePassword(user!, newPassword);
      Alert.alert('Success', 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This action is permanent and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await updateDoc(doc(db, 'users', user!.uid), { deleted: true });
              await user!.delete();
              router.replace('/login');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account. You may need to re-login first.');
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* HERO HEADER */}
      <LinearGradient colors={Gradients.light.sunrise} style={styles.heroPanel}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back-outline" size={20} color={Colors.light.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="settings-outline" size={22} color="white" />
          </View>
          <View>
            <Text style={styles.eyebrow}>Preferences</Text>
            <Text style={styles.heading}>Settings</Text>
          </View>
        </View>

        <Text style={styles.heroSub}>Manage your account, notifications, and security preferences.</Text>
      </LinearGradient>

      {/* ACCOUNT */}
      <SectionLabel icon="person-outline" label="Account" color="#2563EB" bg="#DBEAFE" />
      <View style={styles.card}>
        <View style={styles.accountRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={22} color={Colors.light.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountLabel}>Signed in as</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>{user?.email}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>
      </View>

      {/* NOTIFICATIONS */}
      <SectionLabel icon="notifications-outline" label="Notifications" color="#7C3AED" bg="#EDE9FE" />
      <View style={styles.card}>
        <NotifRow
          icon="mail-outline"
          label="Email Notifications"
          sublabel="Updates sent to your email"
          value={emailNotifs}
          onValueChange={setEmailNotifs}
          color="#2563EB"
          bg="#DBEAFE"
        />
        <View style={styles.divider} />
        <NotifRow
          icon="phone-portrait-outline"
          label="Push Notifications"
          sublabel="Alerts on your device"
          value={pushNotifs}
          onValueChange={setPushNotifs}
          color="#7C3AED"
          bg="#EDE9FE"
        />
      </View>

      {/* CHANGE PASSWORD */}
      <SectionLabel icon="lock-closed-outline" label="Change Password" color="#059669" bg="#D1FAE5" />
      <View style={styles.card}>
        <PasswordInput
          label="Current Password"
          placeholder="Enter current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          show={showCurrent}
          onToggleShow={() => setShowCurrent((v) => !v)}
        />
        <PasswordInput
          label="New Password"
          placeholder="At least 6 characters"
          value={newPassword}
          onChangeText={setNewPassword}
          show={showNew}
          onToggleShow={() => setShowNew((v) => !v)}
        />
        <PasswordInput
          label="Confirm New Password"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          show={showConfirm}
          onToggleShow={() => setShowConfirm((v) => !v)}
        />

        <TouchableOpacity
          style={[styles.actionBtn, pwLoading && styles.btnDisabled]}
          onPress={handleChangePassword}
          disabled={pwLoading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={Gradients.light.primary} style={styles.actionBtnGradient}>
            <Ionicons name="lock-closed-outline" size={16} color="white" />
            <Text style={styles.actionBtnText}>
              {pwLoading ? 'Updating…' : 'Update Password'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* DANGER ZONE */}
      <SectionLabel icon="warning-outline" label="Danger Zone" color="#DC2626" bg="#FEE2E2" />
      <View style={[styles.card, styles.dangerCard]}>
        <View style={styles.dangerNotice}>
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.dangerDescription}>
            Permanently deletes your account and all associated data. This cannot be undone.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.deleteBtn, deleteLoading && styles.btnDisabled]}
          onPress={handleDeleteAccount}
          disabled={deleteLoading}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={16} color="white" />
          <Text style={styles.actionBtnText}>
            {deleteLoading ? 'Deleting…' : 'Delete Account'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* APP VERSION */}
      <View style={styles.versionRow}>
        <Ionicons name="radio-outline" size={14} color={Colors.light.textSecondary} />
        <Text style={styles.versionText}>CampusPulse · Version 1.0.0</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

/* ─── Sub-components ─── */

function SectionLabel({
  icon,
  label,
  color,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={sectionLabelStyles.row}>
      <View style={[sectionLabelStyles.icon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={sectionLabelStyles.text}>{label}</Text>
    </View>
  );
}

const sectionLabelStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 6,
  },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
});

function NotifRow({
  icon,
  label,
  sublabel,
  value,
  onValueChange,
  color,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  color: string;
  bg: string;
}) {
  return (
    <View style={notifStyles.row}>
      <View style={[notifStyles.icon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={notifStyles.label}>{label}</Text>
        <Text style={notifStyles.sublabel}>{sublabel}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E2E8F0', true: Colors.light.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const notifStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: Colors.light.text,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
  },
  sublabel: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
});

function PasswordInput({
  label,
  placeholder,
  value,
  onChangeText,
  show,
  onToggleShow,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <View style={pwStyles.wrapper}>
      <Text style={pwStyles.label}>{label}</Text>
      <View style={pwStyles.inputRow}>
        <TextInput
          style={pwStyles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.textSecondary}
          secureTextEntry={!show}
          value={value}
          onChangeText={onChangeText}
        />
        <TouchableOpacity onPress={onToggleShow} style={pwStyles.eyeBtn}>
          <Ionicons
            name={show ? 'eye-outline' : 'eye-off-outline'}
            size={18}
            color={Colors.light.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pwStyles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  input: {
    flex: 1,
    color: Colors.light.text,
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
});

/* ─── Main styles ─── */

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
    marginBottom: 22,
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
  dangerCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },

  // ACCOUNT
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountLabel: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
  },
  accountEmail: {
    color: Colors.light.text,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  verifiedText: {
    color: '#16A34A',
    fontFamily: 'Sora_700Bold',
    fontSize: 11,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },

  // BUTTONS
  actionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionBtnText: {
    color: 'white',
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // DANGER
  dangerNotice: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  dangerDescription: {
    color: '#991B1B',
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 16,
  },

  // VERSION
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  versionText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
  },
});