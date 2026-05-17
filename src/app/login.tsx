// app/login.tsx  ← new file, place alongside signup.tsx

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import { logIn } from '../firebase/authService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) { alert('Enter email and password.'); return; }
    setLoading(true);
    try {
      await logIn(email, password);
      router.replace('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.appName}>CampusPulse</Text>
        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>Log in to your account</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="you@college.edu" placeholderTextColor="#555"
          style={styles.input} value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Your password" placeholderTextColor="#555"
          style={styles.input} value={password} onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Log In</Text>}
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.mutedText}>Don't have an account? </Text>
          <Link href="/signup" asChild>
            <TouchableOpacity><Text style={styles.link}>Sign Up</Text></TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 24, justifyContent: 'center' },
  appName: { color: '#4f46e5', fontSize: 14, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  heading: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 6 },
  subheading: { color: '#888', fontSize: 15, marginBottom: 32 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { backgroundColor: '#1e1e1e', color: 'white', padding: 15, borderRadius: 12, fontSize: 15, marginBottom: 16 },
  button: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  buttonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'center' },
  mutedText: { color: '#888', fontSize: 14 },
  link: { color: '#22c55e', fontSize: 14, fontWeight: '700' },
});