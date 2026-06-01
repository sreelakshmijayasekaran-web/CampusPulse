import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function Sidebar() {
  return (
    <View style={styles.sidebar}>

      <TouchableOpacity onPress={() => router.push('/')}>
        <Ionicons name="home-outline" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/notifications')}>
        <Ionicons name="notifications-outline" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/feedback')}>
        <Ionicons name="chatbubble-ellipses-outline" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/help')}>
        <Ionicons name="help-circle-outline" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/settings')}>
        <Ionicons name="settings-outline" size={26} color="white" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/profile')}>
        <Ionicons name="person-circle-outline" size={30} color="white" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 72,
    backgroundColor: '#090909',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    zIndex: 999,
  },
});