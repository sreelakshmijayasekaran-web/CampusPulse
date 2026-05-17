import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export default function CreateEvent() {

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [time, setTime] = useState('');

  const handleCreateEvent = () => {

    const eventData = {
      title,
      venue,
      time,
      club: 'IEDC',
    };

    console.log(eventData);

    alert('Event Created!');
  };

  return (
    <View style={styles.container}>

      <Text style={styles.heading}>Create Event</Text>

      <TextInput
        placeholder="Event Title"
        placeholderTextColor="#888"
        style={styles.input}
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        placeholder="Venue"
        placeholderTextColor="#888"
        style={styles.input}
        value={venue}
        onChangeText={setVenue}
      />

      <TextInput
        placeholder="Time"
        placeholderTextColor="#888"
        style={styles.input}
        value={time}
        onChangeText={setTime}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleCreateEvent}
      >
        <Text style={styles.buttonText}>Create Event</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    justifyContent: 'center',
  },

  heading: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },

  input: {
    backgroundColor: '#1e1e1e',
    color: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },

  button: {
    backgroundColor: '#4f46e5',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

});