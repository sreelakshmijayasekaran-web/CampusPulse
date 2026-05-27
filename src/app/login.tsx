import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Link, router } from 'expo-router';
import { logIn } from '../firebase/authService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Enter email and password');
      return;
    }

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.container}>

        {/* LEFT */}
        <View style={styles.leftPanel}>
          <Text style={styles.brand}>CAMPUSPULSE</Text>

          <View>
            <Text style={styles.bigText}>
              Explore.{'\n'}
              Register.{'\n'}
              Show up.
            </Text>

            <Text style={styles.caption}>
              Your college event hub
            </Text>
          </View>
        </View>

        {/* RIGHT */}
        <ScrollView
          contentContainerStyle={styles.rightPanel}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          <Text style={styles.heading}>Log in</Text>

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              placeholder="you@college.edu"
              placeholderTextColor="#999"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#999"
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                Continue →
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>New here? </Text>

            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>
                  Create account
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

        </ScrollView>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#111111',
  },

  leftPanel: {
    flex: 1,
    backgroundColor: '#ff5a1f',
    padding: 50,
    justifyContent: 'space-between',
  },

  rightPanel: {
    flexGrow: 1,
    flex: 1,
    backgroundColor: '#f4f4f4',
    justifyContent: 'center',
    padding: 50,
  },

  brand: {
    color: 'white',
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: '800',
  },

  bigText: {
    fontSize: 54,
    fontWeight: '800',
    color: 'white',
    lineHeight: 60,
  },

  caption: {
    marginTop: 18,
    color: '#ffe5db',
    fontSize: 17,
  },

  heading: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111',
    marginBottom: 40,
  },

  field: {
    marginBottom: 28,
  },

  label: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#ff5a1f',
    marginBottom: 10,
    fontWeight: '700',
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 12,
    fontSize: 16,
    color: '#111',
  },

  button: {
    backgroundColor: '#ff5a1f',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,

    shadowColor: '#ff5a1f',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },

  bottomRow: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'center',
  },

  bottomText: {
    color: '#999',
  },

  link: {
    color: '#ff5a1f',
    fontWeight: '700',
  },
});