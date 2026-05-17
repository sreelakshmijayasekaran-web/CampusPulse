// app/signup.tsx  ← replace your existing signup.tsx with this

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { signUp } from '../firebase/authService';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'organizer'>('student');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!college.trim()) e.college = 'College / department is required';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(name, email, college, password, role);
      router.replace('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.appName}>CampusPulse</Text>
          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subheading}>Join your college event hub</Text>
        </View>

        <View style={styles.roleRow}>
          {(['student', 'organizer'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r === 'student' ? '🎓 Student' : '🗂 Organizer'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Full Name" placeholder="e.g. Arjun Menon" value={name} onChangeText={setName} error={errors.name} />
        <Field label="College Email" placeholder="you@college.edu" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
        <Field label="College / Department" placeholder="e.g. NIT Calicut – CSE" value={college} onChangeText={setCollege} error={errors.college} />
        <Field label="Password" placeholder="Min. 6 characters" value={password} onChangeText={setPassword} secureTextEntry error={errors.password} />
        <Field label="Confirm Password" placeholder="Re-enter password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry error={errors.confirmPassword} />

        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.buttonText}>Create Account</Text>
          }
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity><Text style={styles.loginLink}>Log in</Text></TouchableOpacity>
          </Link>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string; placeholder: string; value: string;
  onChangeText: (v: string) => void; secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address'; autoCapitalize?: 'none' | 'sentences';
  error?: string;
};
function Field({ label, placeholder, value, onChangeText, secureTextEntry, keyboardType = 'default', autoCapitalize = 'sentences', error }: FieldProps) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholder={placeholder} placeholderTextColor="#555"
        style={[styles.input, error ? styles.inputError : null]}
        value={value} onChangeText={onChangeText}
        secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 28 },
  appName: { color: '#4f46e5', fontSize: 14, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  heading: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 6 },
  subheading: { color: '#888', fontSize: 15 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1e1e1e', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  roleBtnActive: { borderColor: '#4f46e5', backgroundColor: '#1e1b4b' },
  roleBtnText: { color: '#888', fontWeight: '600', fontSize: 15 },
  roleBtnTextActive: { color: 'white' },
  fieldWrapper: { marginBottom: 16 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { backgroundColor: '#1e1e1e', color: 'white', padding: 15, borderRadius: 12, fontSize: 15, borderWidth: 1.5, borderColor: 'transparent' },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4, marginLeft: 4 },
  button: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  buttonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: '#888', fontSize: 14 },
  loginLink: { color: '#22c55e', fontSize: 14, fontWeight: '700' },
});