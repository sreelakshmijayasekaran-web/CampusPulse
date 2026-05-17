// firebase/authService.ts

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export async function signUp(
  name: string,
  email: string,
  college: string,
  password: string,
  role: 'student' | 'organizer'
) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await setDoc(doc(db, 'users', user.uid), {
    name,
    email,
    college,
    role,
    // organizers start as 'pending' until admin approves
    // students are automatically 'approved'
    status: role === 'organizer' ? 'pending' : 'approved',
    createdAt: serverTimestamp(),
  });

  return user;
}

export async function logIn(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logOut() {
  await signOut(auth);
}