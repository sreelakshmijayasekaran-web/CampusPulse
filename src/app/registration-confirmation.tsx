import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { auth, db } from "../firebase/firebaseConfig";

import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

export default function RegistrationConfirmation() {
  const { eventId } = useLocalSearchParams();

  const handleConfirm = async () => {
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
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 15,
        }}
      >
        🎉 Form Submitted
      </Text>

      <Text
        style={{
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        Click below to confirm your registration.
      </Text>

      <TouchableOpacity
        onPress={handleConfirm}
        style={{
          backgroundColor: "#22c55e",
          paddingHorizontal: 30,
          paddingVertical: 15,
          borderRadius: 12,
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
    </View>
  );
}