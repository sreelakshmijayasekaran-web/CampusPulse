import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { auth, db } from "../firebase/firebaseConfig";

import {
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

export default function RegistrationConfirmation() {
  const { eventId } = useLocalSearchParams();

  const [submitted, setSubmitted] = useState(false);

  const handleConfirm = async () => {
    if (!submitted) {
      Alert.alert(
        "Confirmation Required",
        "Please confirm that you submitted the form."
      );
      return;
    }

    try {
      const uid = auth.currentUser?.uid;

      if (!uid) {
        Alert.alert("Please login first");
        return;
      }

      await updateDoc(doc(db, "events", String(eventId)), {
        registeredUsers: arrayUnion(uid),
      });

      Alert.alert(
        "Success",
        "Your registration has been confirmed."
      );

      router.replace(`/event-details?id=${eventId}`);

    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 15,
          textAlign: "center",
        }}
      >
        🎉 Registration Confirmation
      </Text>

      <Text
        style={{
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        Did you submit the Google Form?
      </Text>

      {/* Checkbox */}
      <TouchableOpacity
        onPress={() => setSubmitted(!submitted)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 25,
        }}
      >
        <Text style={{ fontSize: 22 }}>
          {submitted ? "☑️" : "⬜"}
        </Text>

        <Text
          style={{
            marginLeft: 10,
            fontSize: 16,
          }}
        >
          I confirm that I have submitted the form
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={!submitted}
        onPress={handleConfirm}
        style={{
          backgroundColor: submitted
            ? "#22c55e"
            : "#9ca3af",
          paddingHorizontal: 30,
          paddingVertical: 15,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "bold",
          }}
        >
          ✅ Confirm Registration
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.replace(`/event-details?id=${eventId}`)
        }
        style={{
          marginTop: 15,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#2563eb" }}>
          ← Back to Event
        </Text>
      </TouchableOpacity>
    </View>
  );
}