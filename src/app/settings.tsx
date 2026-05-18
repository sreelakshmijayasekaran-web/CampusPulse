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
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

export default function Settings() {
  const user = auth.currentUser;

  // Notification toggles
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Delete account state
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* ACCOUNT SECTION */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user?.email}</Text>
        </View>
      </View>

      {/* NOTIFICATIONS SECTION */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email Notifications</Text>
          <Switch
            value={emailNotifs}
            onValueChange={setEmailNotifs}
            trackColor={{ false: '#3a3a3a', true: '#4f46e5' }}
            thumbColor={emailNotifs ? '#fff' : '#888'}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Push Notifications</Text>
          <Switch
            value={pushNotifs}
            onValueChange={setPushNotifs}
            trackColor={{ false: '#3a3a3a', true: '#4f46e5' }}
            thumbColor={pushNotifs ? '#fff' : '#888'}
          />
        </View>
      </View>

      {/* CHANGE PASSWORD SECTION */}
      <Text style={styles.sectionTitle}>Change Password</Text>
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Current Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter current password"
          placeholderTextColor="#555"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <Text style={styles.inputLabel}>New Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter new password"
          placeholderTextColor="#555"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Text style={styles.inputLabel}>Confirm New Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#555"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={[styles.button, pwLoading && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={pwLoading}
        >
          <Text style={styles.buttonText}>
            {pwLoading ? 'Updating…' : '🔒 Update Password'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* DANGER ZONE */}
      <Text style={styles.sectionTitle}>Danger Zone</Text>
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.dangerDescription}>
          Permanently delete your account and all associated data. This cannot be undone.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton, deleteLoading && styles.buttonDisabled]}
          onPress={handleDeleteAccount}
          disabled={deleteLoading}
        >
          <Text style={styles.buttonText}>
            {deleteLoading ? 'Deleting…' : '🗑️ Delete Account'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* APP INFO */}
      <Text style={styles.appVersion}>App Version 1.0.0</Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 28,
  },

  backButton: {
    marginBottom: 8,
  },

  backText: {
    color: '#4f46e5',
    fontSize: 15,
    fontWeight: '600',
  },

  title: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
  },

  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 24,
  },

  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
  },

  dangerCard: {
    borderWidth: 1,
    borderColor: '#3a1c1c',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },

  rowLabel: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },

  rowValue: {
    color: '#888',
    fontSize: 14,
    flexShrink: 1,
    marginLeft: 12,
    textAlign: 'right',
  },

  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 8,
  },

  inputLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 12,
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#2a2a2a',
    color: 'white',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  button: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  deleteButton: {
    backgroundColor: '#ef4444',
  },

  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },

  dangerDescription: {
    color: '#888',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },

  appVersion: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});