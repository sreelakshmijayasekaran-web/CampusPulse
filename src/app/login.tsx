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
  Alert,
  Modal,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { sendPasswordResetEmail } from 'firebase/auth';
import { logIn } from '../firebase/authService';
import { auth } from '../firebase/firebaseConfig';
import { Colors, Gradients } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal state
  const [forgotVisible, setForgotVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isWebLarge = Platform.OS === 'web' && SCREEN_WIDTH > 768;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await logIn(email, password);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Enter your email', 'Please enter your registered email address.');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseModal = () => {
    setForgotVisible(false);
    setResetEmail('');
    setResetSent(false);
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
          {isWebLarge && <View />}
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
              <View style={styles.passwordRow}>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password link */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => {
                setResetEmail(email); // pre-fill with entered email
                setForgotVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

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
                  <Text style={styles.buttonText}>Continue →</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.bottomRow}>
              <Text style={styles.bottomText}>New here? </Text>
              <Link href="/signup" asChild>
                <TouchableOpacity activeOpacity={0.85}>
                  <Text style={styles.link}>Create account</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* FORGOT PASSWORD MODAL */}
      <Modal
        visible={forgotVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {resetSent ? (
              // Success state
              <>
                <Text style={styles.modalEmoji}>📬</Text>
                <Text style={styles.modalTitle}>Check your inbox!</Text>
                <Text style={styles.modalSubtext}>
                  We sent a password reset link to{' '}
                  <Text style={{ color: Colors.light.primary, fontFamily: 'Sora_700Bold' }}>
                    {resetEmail}
                  </Text>
                  . Check your email and follow the link to reset your password.
                </Text>
                <TouchableOpacity style={styles.modalBtn} onPress={handleCloseModal}>
                  <LinearGradient colors={Gradients.light.primary} style={styles.modalBtnGradient}>
                    <Text style={styles.modalBtnText}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              // Input state
              <>
                <Text style={styles.modalEmoji}>🔑</Text>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSubtext}>
                  Enter your registered email and we'll send you a reset link.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="you@college.edu"
                  placeholderTextColor="#94A3B8"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={Gradients.light.primary} style={styles.modalBtnGradient}>
                    {resetLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.modalBtnText}>Send Reset Link</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCloseModal} style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 18,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotText: {
    color: Colors.light.primary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
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

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 10,
  },
  modalEmoji: {
    fontSize: 42,
    marginBottom: 14,
  },
  modalTitle: {
    color: Colors.light.text,
    fontFamily: 'Sora_700Bold',
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtext: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: Colors.light.text,
    marginBottom: 16,
  },
  modalBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    color: 'white',
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
  },
  modalCancelBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
  },
});