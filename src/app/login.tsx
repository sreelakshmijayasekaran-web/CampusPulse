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
  Dimensions,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { logIn } from '../firebase/authService';
import { Colors, Gradients } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isWebLarge = Platform.OS === 'web' && SCREEN_WIDTH > 768;

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
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={[styles.container, !isWebLarge && styles.containerMobile]}>

        {/* LEFT PANEL: BRANDING */}
        <LinearGradient
          colors={Gradients.light.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.leftPanel, !isWebLarge && styles.leftPanelMobile]}
        >
          <Text style={styles.brand}>CAMPUSPULSE</Text>

          <View style={!isWebLarge && { marginTop: 12 }}>
            <Text style={[styles.bigText, !isWebLarge && styles.bigTextMobile]}>
              Explore.{isWebLarge ? '\n' : ' '}
              Register.{isWebLarge ? '\n' : ' '}
              Show up.
            </Text>

            <Text style={[styles.caption, !isWebLarge && styles.captionMobile]}>
              Your college event hub
            </Text>
          </View>
          {isWebLarge && <View />} {/* Spacing layout placeholder */}
        </LinearGradient>

        {/* RIGHT PANEL: FORM */}
        <ScrollView
          contentContainerStyle={[styles.rightPanel, !isWebLarge && styles.rightPanelMobile]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <Text style={styles.heading}>Log in</Text>

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                placeholder="you@college.edu"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={Gradients.light.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    Continue →
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.bottomRow}>
              <Text style={styles.bottomText}>New here? </Text>
              <Link href="/signup" asChild>
                <TouchableOpacity activeOpacity={0.85}>
                  <Text style={styles.link}>
                    Create account
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
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
    backgroundColor: Colors.light.background,
  },

  containerMobile: {
    flexDirection: 'column',
  },

  leftPanel: {
    flex: 1,
    padding: 50,
    justifyContent: 'space-between',
  },

  leftPanelMobile: {
    flex: 0,
    padding: 24,
    paddingTop: 50,
    justifyContent: 'center',
  },

  rightPanel: {
    flexGrow: 1,
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    padding: 50,
  },

  rightPanelMobile: {
    padding: 24,
    paddingTop: 36,
  },

  formContainer: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },

  brand: {
    color: 'white',
    fontSize: 11,
    letterSpacing: 4,
    fontFamily: 'Sora_700Bold',
  },

  bigText: {
    fontSize: 48,
    fontFamily: 'Sora_700Bold',
    color: 'white',
    lineHeight: 52,
  },

  bigTextMobile: {
    fontSize: 28,
    lineHeight: 32,
  },

  caption: {
    marginTop: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontFamily: 'Sora_400Regular',
  },

  captionMobile: {
    fontSize: 14,
    marginTop: 6,
  },

  heading: {
    fontSize: 32,
    fontFamily: 'Sora_700Bold',
    color: Colors.light.text,
    marginBottom: 32,
    letterSpacing: -0.5,
  },

  field: {
    marginBottom: 20,
  },

  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.light.primary,
    marginBottom: 8,
    fontFamily: 'Sora_700Bold',
  },

  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: Colors.light.text,
  },

  button: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },

  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: 'white',
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
  },

  bottomRow: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'center',
  },

  bottomText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
  },

  link: {
    color: Colors.light.primary,
    fontFamily: 'Sora_700Bold',
    fontSize: 13,
  },
});