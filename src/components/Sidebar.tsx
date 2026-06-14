import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '../constants/theme';

export default function Sidebar() {
  return (
    <LinearGradient colors={Gradients.light.campus} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sidebar}>

      <TouchableOpacity style={styles.navButton} onPress={() => router.push('/')}>
        <Ionicons name="home-outline" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={() => router.push('/notifications')}>
        <Ionicons name="notifications-outline" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={() => router.push('/feedback')}>
        <Ionicons name="chatbubble-ellipses-outline" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={() => router.push('/help')}>
        <Ionicons name="help-circle-outline" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={() => router.push('/settings')}>
        <Ionicons name="settings-outline" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={() => router.push('/profile')}>
        <Ionicons name="person-circle-outline" size={30} color="white" />
      </TouchableOpacity>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
    zIndex: 999,
    shadowColor: '#2563EB',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  navButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
