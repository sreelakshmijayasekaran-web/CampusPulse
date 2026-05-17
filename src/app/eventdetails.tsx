import { View, Text, StyleSheet } from "react-native";

export default function EventDetailsScreen() {
  const event = {
    title: "Tech Fest",
    date: "20 May 2026",
    venue: "College Auditorium",
    description: "Coding and robotics competitions"
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.text}>Date: {event.date}</Text>
      <Text style={styles.text}>Venue: {event.venue}</Text>
      <Text style={styles.description}>{event.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    marginTop: 20,
    lineHeight: 24,
  },
});