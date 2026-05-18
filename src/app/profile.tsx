import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          router.replace('/login');
          return;
        }

        const snap = await getDoc(doc(db, 'users', user.uid));

        if (snap.exists()) {
          setUserData(snap.data());
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
    await auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>No user data found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <Text style={styles.title}>My Profile</Text>

      {/* PROFILE CARD */}
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{userData.name}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{userData.email}</Text>

        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{userData.phone || 'Not added'}</Text>

        <Text style={styles.label}>Department</Text>
        <Text style={styles.value}>{userData.department || 'Not added'}</Text>

        <Text style={styles.label}>Year</Text>
        <Text style={styles.value}>{userData.year || 'Not added'}</Text>

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{userData.role}</Text>
      </View>

      {/* SETTINGS BUTTON */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/settings')}
      >
        <Text style={styles.buttonText}>⚙️ Settings</Text>
      </TouchableOpacity>

      {/* HELP BUTTON */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/help')}
      >
        <Text style={styles.buttonText}>❓ Help</Text>
      </TouchableOpacity>

      {/* LOGOUT BUTTON */}
      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>🚪 Log Out</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
    paddingTop: 60,
  },

  centered: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  card: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },

  label: {
    color: '#888',
    fontSize: 13,
    marginTop: 12,
  },

  value: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },

  button: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },

  logoutButton: {
    backgroundColor: '#ef4444',
  },

  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  text: {
    color: 'white',
  },
});