// firebase/authService.ts
// Handles signup and login using Firebase Auth + saves user profile to Firestore

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// ── Sign Up ─────────────────────────────────────────────────────────────────
// Creates a Firebase Auth user, then saves extra info (name, college, role)
// to the "users" collection in Firestore.

export async function signUp(
  name: string,
  email: string,
  college: string,
  password: string,
  role: 'student' | 'organizer'
) {
  // 1. Create auth account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // 2. Save profile to Firestore → users/{uid}
  await setDoc(doc(db, 'users', user.uid), {
    name,
    email,
    college,
    role,
    createdAt: serverTimestamp(),
  });

  return user;
}

// ── Log In ───────────────────────────────────────────────────────────────────

export async function logIn(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// ── Log Out ──────────────────────────────────────────────────────────────────

export async function logOut() {
  await signOut(auth);
}