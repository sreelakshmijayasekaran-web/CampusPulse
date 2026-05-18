// app/event-registrations.tsx

import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { doc, getDoc } from 'firebase/firestore';

import { Event, fetchEventById } from '../firebase/eventService';
import { db } from '../firebase/firebaseConfig';

export default function EventRegistrations() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      if (!id) return;

      // Fetch event
      const eventData = await fetchEventById(id);

      if (!eventData) return;

      setEvent(eventData);

      // Fetch registered students
      const userData = await Promise.all(
        (eventData.registeredUsers || []).map(async (uid) => {
          const userSnap = await getDoc(doc(db, 'users', uid));

          if (userSnap.exists()) {
            return {
              id: uid,
              ...userSnap.data(),
            };
          }

          return null;
        })
      );

      setStudents(userData.filter(Boolean));

    } catch (error) {
      console.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Loading screen
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >

      {/* Back Button */}
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>

      {/* Event Title */}
      <Text style={styles.heading}>
        {event?.title}
      </Text>

      {/* Registration Count */}
      <View style={styles.countCard}>
        <Text style={styles.countNumber}>
          {students.length}
        </Text>

        <Text style={styles.countLabel}>
          Registered Students
        </Text>
      </View>

      {/* Empty State */}
      {students.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No registrations yet
          </Text>
        </View>
      ) : (
        students.map((student) => (
          <View key={student.id} style={styles.studentCard}>

            <Text style={styles.studentName}>
              {student.name || 'Unnamed Student'}
            </Text>

            <Text style={styles.studentEmail}>
              {student.email}
            </Text>

            {student.department && (
              <Text style={styles.studentDepartment}>
                🎓 {student.department}
              </Text>
            )}

          </View>
        ))
      )}

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

  centered: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backButton: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },

  heading: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },

  countCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4f46e5',
  },

  countNumber: {
    color: '#818cf8',
    fontSize: 44,
    fontWeight: 'bold',
  },

  countLabel: {
    color: '#c7d2fe',
    fontSize: 15,
    marginTop: 6,
  },

  studentCard: {
    backgroundColor: '#1e1e1e',
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
  },

  studentName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  studentEmail: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 6,
  },

  studentDepartment: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
  },

  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
  },

  emptyText: {
    color: '#666',
    fontSize: 16,
  },
});