import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { signUp } from '../firebase/authService';
import { Colors, Gradients } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG'];

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'organizer'>('student');
  const [loading, setLoading] = useState(false);

  const isWebLarge = Platform.OS === 'web' && SCREEN_WIDTH > 768;

  const handleSignup = async () => {
    if (
      !name ||
      !email ||
      !phone ||
      !college ||
      !department ||
      !year ||
      !password
    ) {
      alert('Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await signUp(
        name,
        email,
        phone,
        college,
        department,
        year,
        password,
        role
      );

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
              Join.{isWebLarge ? '\n' : ' '}
              Connect.{isWebLarge ? '\n' : ' '}
              Discover.
            </Text>

            <Text style={[styles.caption, !isWebLarge && styles.captionMobile]}>
              Create your student identity
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
            <Text style={styles.heading}>Create Account</Text>

            {/* ROLE SELECTOR */}
            <Text style={styles.sectionLabel}>I AM A...</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === 'student' && styles.roleButtonActive,
                ]}
                onPress={() => setRole('student')}
                activeOpacity={0.85}
              >
                {role === 'student' ? (
                  <LinearGradient
                    colors={Gradients.light.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.roleButtonGradient}
                  >
                    <Text style={styles.roleTextActive}>🎓 Student</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.roleText}>🎓 Student</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === 'organizer' && styles.roleButtonActive,
                ]}
                onPress={() => setRole('organizer')}
                activeOpacity={0.85}
              >
                {role === 'organizer' ? (
                  <LinearGradient
                    colors={Gradients.light.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.roleButtonGradient}
                  >
                    <Text style={styles.roleTextActive}>🗂 Organizer</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.roleText}>🗂 Organizer</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* INPUT FIELDS */}
            <Field
              label="FULL NAME"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />

            <Field
              label="EMAIL"
              value={email}
              onChangeText={setEmail}
              placeholder="you@college.edu"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Field
              label="PHONE"
              value={phone}
              onChangeText={setPhone}
              placeholder="9876543210"
              keyboardType="phone-pad"
            />

            <Field
              label="COLLEGE"
              value={college}
              onChangeText={setCollege}
              placeholder="Your college"
            />

            <Field
              label="DEPARTMENT"
              value={department}
              onChangeText={setDepartment}
              placeholder="Computer Science"
            />

            {/* YEAR SELECTOR */}
            <Text style={styles.label}>YEAR</Text>
            <View style={styles.yearRow}>
              {YEARS.map((y) => {
                const isSelected = year === y;
                return (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setYear(y)}
                    activeOpacity={0.85}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={Gradients.light.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.yearButtonActive}
                      >
                        <Text style={styles.yearTextActive}>{y}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.yearButton}>
                        <Text style={styles.yearText}>{y}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Field
              label="PASSWORD"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />

            <Field
              label="CONFIRM PASSWORD"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />

            {/* SIGNUP BUTTON */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleSignup}
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
                    Create Account →
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* LOGIN LINK */}
            <View style={styles.bottomRow}>
              <Text style={styles.bottomText}>Already have an account? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity activeOpacity={0.85}>
                  <Text style={styles.link}>Log in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>

      </View>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
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
    color: 'white',
    fontSize: 48,
    fontFamily: 'Sora_700Bold',
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
    marginBottom: 24,
    letterSpacing: -0.5,
  },

  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.light.textSecondary,
    marginBottom: 10,
    fontFamily: 'Sora_700Bold',
  },

  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
  },

  roleButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  roleButtonActive: {
    borderColor: 'transparent',
  },

  roleText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    paddingVertical: 14,
    textAlign: 'center',
  },

  roleTextActive: {
    color: 'white',
    fontFamily: 'Sora_700Bold',
    fontSize: 13,
  },

  field: {
    marginBottom: 20,
  },

  label: {
    fontSize: 10,
    color: Colors.light.primary,
    marginBottom: 8,
    letterSpacing: 1.5,
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

  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
    marginTop: 2,
  },

  yearButton: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'white',
  },

  yearButtonActive: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  yearText: {
    color: Colors.light.textSecondary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
  },

  yearTextActive: {
    color: 'white',
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
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
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 30,
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