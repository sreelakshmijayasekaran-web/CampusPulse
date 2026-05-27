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
} from 'react-native';
import { Link, router } from 'expo-router';
import { signUp } from '../firebase/authService';

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
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.container}>

        {/* LEFT PANEL */}
        <View style={styles.leftPanel}>

          <Text style={styles.brand}>
            CAMPUSPULSE
          </Text>

          <View>
            <Text style={styles.bigText}>
              Join.{'\n'}
              Connect.{'\n'}
              Discover.
            </Text>

            <Text style={styles.caption}>
              Create your student identity
            </Text>
          </View>

        </View>

        {/* RIGHT PANEL */}
        <ScrollView
          contentContainerStyle={styles.rightPanel}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          <Text style={styles.heading}>
            Create Account
          </Text>

          {/* ROLE */}
          <View style={styles.roleRow}>

            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'student' && styles.roleButtonActive,
              ]}
              onPress={() => setRole('student')}
            >
              <Text
                style={[
                  styles.roleText,
                  role === 'student' && styles.roleTextActive,
                ]}
              >
                🎓 Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'organizer' && styles.roleButtonActive,
              ]}
              onPress={() => setRole('organizer')}
            >
              <Text
                style={[
                  styles.roleText,
                  role === 'organizer' && styles.roleTextActive,
                ]}
              >
                🗂 Organizer
              </Text>
            </TouchableOpacity>

          </View>

          {/* INPUTS */}
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
          />

          <Field
            label="PHONE"
            value={phone}
            onChangeText={setPhone}
            placeholder="9876543210"
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

          {/* YEAR */}
          <Text style={styles.label}>YEAR</Text>

          <View style={styles.yearRow}>
            {YEARS.map((y) => (
              <TouchableOpacity
                key={y}
                style={[
                  styles.yearButton,
                  year === y && styles.yearButtonActive,
                ]}
                onPress={() => setYear(y)}
              >
                <Text
                  style={[
                    styles.yearText,
                    year === y && styles.yearTextActive,
                  ]}
                >
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          <Field
            label="CONFIRM PASSWORD"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          {/* BUTTON */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                Create Account →
              </Text>
            )}
          </TouchableOpacity>

          {/* LOGIN */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>
              Already have an account?
            </Text>

            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>
                  {' '}Log in
                </Text>
              </TouchableOpacity>
            </Link>
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
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
      />
    </View>
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
    padding: 50,
  },

  brand: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
  },

  bigText: {
    color: 'white',
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 58,
  },

  caption: {
    marginTop: 16,
    color: '#ffe5db',
    fontSize: 16,
  },

  heading: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111',
    marginBottom: 30,
  },

  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },

  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'white',
  },

  roleButtonActive: {
    backgroundColor: '#fff2ec',
    borderColor: '#ff5a1f',
  },

  roleText: {
    color: '#666',
    fontWeight: '600',
  },

  roleTextActive: {
    color: '#ff5a1f',
    fontWeight: '700',
  },

  field: {
    marginBottom: 26,
  },

  label: {
    fontSize: 11,
    color: '#ff5a1f',
    marginBottom: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 12,
    fontSize: 16,
    color: '#111',
  },

  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },

  yearButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
  },

  yearButtonActive: {
    borderColor: '#ff5a1f',
    backgroundColor: '#fff2ec',
  },

  yearText: {
    color: '#666',
    fontWeight: '600',
  },

  yearTextActive: {
    color: '#ff5a1f',
    fontWeight: '700',
  },

  button: {
    backgroundColor: '#ff5a1f',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,

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
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 30,
  },

  bottomText: {
    color: '#999',
  },

  link: {
    color: '#ff5a1f',
    fontWeight: '700',
  },
});