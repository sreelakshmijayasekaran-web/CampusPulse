import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Link } from 'expo-router';
export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      
      <Text style={styles.heading}>
        CampusPulse
      </Text>
      <Link href="/signup" asChild>
        <TouchableOpacity style={styles.signupButton}>
          <Text style={styles.buttonText}>Signup</Text>
        </TouchableOpacity>
      </Link>

      <Text style={styles.subheading}>
        Upcoming Events
      </Text>

      <View style={styles.card}>
        <Text style={styles.eventTitle}>
          Hackathon 2026
        </Text>

        <Text style={styles.details}>
          📍 Seminar Hall
        </Text>

        <Text style={styles.details}>
          🕒 10:00 AM
        </Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>
            Register
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.eventTitle}>
          UI/UX Workshop
        </Text>

        <Text style={styles.details}>
          📍 Lab 3
        </Text>

        <Text style={styles.details}>
          🕒 2:00 PM
        </Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>
            Register
          </Text>
        </TouchableOpacity>
      </View>
    
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  heading: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },

  subheading: {
    fontSize: 18,
    color: "#bbbbbb",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },

  eventTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },

  details: {
    color: "#cccccc",
    fontSize: 16,
    marginBottom: 5,
  },

  button: {
    marginTop: 15,
    backgroundColor: "#4f46e5",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupButton: {
    
  backgroundColor: '#22c55e',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 12,
  alignSelf: 'flex-end',
  marginTop: 20,
  width: 120
},
    
  
   buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});