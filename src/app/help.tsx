import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function Help() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* APP DESCRIPTION */}
      <Text style={styles.title}>CampusPulse</Text>
      <Text style={styles.description}>
        CampusPulse is a smart college event management app that helps students discover,
        register, and stay updated about all campus events like hackathons, workshops,
        seminars, cultural programs, and sports.
      </Text>

      <Text style={styles.description}>
        Organizers can create events, and admins can manage approvals. Students can
        register and mark interest in events easily from one place.
      </Text>

      {/* ADMIN DETAILS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>👨‍💼 Admin Details</Text>

        <Text style={styles.label}>App Administrator</Text>
        <Text style={styles.value}>College Event Management Team</Text>

        <Text style={styles.label}>Support Email</Text>
        <Text style={styles.value}>support@campuspulse.edu</Text>

        <Text style={styles.label}>Contact</Text>
        <Text style={styles.value}>+91 98765 43210</Text>
      </View>

      {/* HELP / FAQ SECTION */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>❓ Help & FAQs</Text>

        <Text style={styles.question}>How do I register for an event?</Text>
        <Text style={styles.answer}>
          Open any event → Click “View Details” → Tap “Register Now” or mark interest.
        </Text>

        <Text style={styles.question}>Why can’t I create events?</Text>
        <Text style={styles.answer}>
          Only approved organizers can create events. Admin must approve your account first.
        </Text>

        <Text style={styles.question}>How do I become an organizer?</Text>
        <Text style={styles.answer}>
          Sign up as organizer → Wait for admin approval → Once approved, you can create events.
        </Text>

        <Text style={styles.question}>I forgot my password?</Text>
        <Text style={styles.answer}>
          Use the “Forgot Password” option in the login screen to reset your password.
        </Text>
      </View>

      {/* FOOTER */}
      <Text style={styles.footer}>
        © 2026 CampusPulse • Built for college event management
      </Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  description: {
    color: '#cccccc',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },

  card: {
    backgroundColor: '#1e1e1e',
    padding: 18,
    borderRadius: 16,
    marginTop: 20,
  },

  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  label: {
    color: '#888',
    fontSize: 12,
    marginTop: 10,
    textTransform: 'uppercase',
  },

  value: {
    color: 'white',
    fontSize: 15,
    marginTop: 4,
  },

  question: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 14,
  },

  answer: {
    color: '#cccccc',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },

  footer: {
    color: '#666',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 12,
  },
});