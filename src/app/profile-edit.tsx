import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

export default function ProfileEdit() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const uid = auth.currentUser?.uid;

      if (!uid) {
        router.back();
        return;
      }

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        setName(data.name || '');
        setEmail(data.email || auth.currentUser?.email || '');
        setPhone(data.phone || '');
        setYear(data.year?.toString() || '');
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;

    if (!uid) return;

    // Phone validation
    if (!/^\d{10}$/.test(phone.trim())) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid 10-digit phone number.'
      );
      return;
    }

    // Year validation
    if (!['1', '2', '3', '4'].includes(year.trim())) {
      Alert.alert(
        'Invalid Year',
        'Year must be 1, 2, 3, or 4.'
      );
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, 'users', uid), {
        phone: phone.trim(),
        year: year.trim(),
      });

      Alert.alert('Success', 'Profile updated successfully!');

setTimeout(() => {
  router.replace('/profile');
}, 1000);
    } catch (error) {
      console.log(error);
      Alert.alert(
        'Error',
        'Failed to update profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Edit Profile</Text>

      {/* Name - Read Only */}
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        editable={false}
        style={[styles.input, styles.disabledInput]}
      />

      {/* Email - Read Only */}
      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        editable={false}
        style={[styles.input, styles.disabledInput]}
      />

      {/* Phone */}
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Enter phone number"
        style={styles.input}
        maxLength={10}
      />

      {/* Year */}
      <Text style={styles.label}>Year</Text>
      <TextInput
        value={year}
        onChangeText={setYear}
        keyboardType="numeric"
        placeholder="1 / 2 / 3 / 4"
        style={styles.input}
        maxLength={1}
      />

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.saveButtonText}>
            Save Changes
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelButtonText}>
          Cancel
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },

  content: {
    padding: 20,
    paddingTop: 60,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 30,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },

  disabledInput: {
    backgroundColor: '#F1F1F1',
    color: '#777',
  },

  saveButton: {
    backgroundColor: '#534AB7',
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  saveButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },

  cancelButton: {
    marginTop: 14,
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
});