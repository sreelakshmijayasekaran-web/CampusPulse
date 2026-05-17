// firebase/eventService.ts

import {
  collection, addDoc, getDocs, getDoc, doc,
  query, orderBy, serverTimestamp,
  updateDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Event = {
  id: string;
  title: string;
  venue: string;
  time: string;
  club: string;
  category: string;
  description: string;       // detailed info about the event
  registerLink: string;      // external registration link (Google Form etc.)
  registeredUsers: string[]; // array of UIDs who tapped "I'm Interested"
  createdBy: string;
};

// ── Create Event ──────────────────────────────────────────────────────────────

export async function createEvent(
  title: string,
  venue: string,
  time: string,
  club: string,
  category: string,
  description: string,
  registerLink: string,
) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in to create an event.');

  const docRef = await addDoc(collection(db, 'events'), {
    title,
    venue,
    time,
    club,
    category,
    description,
    registerLink,
    registeredUsers: [],
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// ── Fetch All Events ──────────────────────────────────────────────────────────

export async function fetchEvents(): Promise<Event[]> {
  const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Event, 'id'>),
  }));
}

// ── Fetch Single Event ────────────────────────────────────────────────────────

export async function fetchEventById(id: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, 'events', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Event, 'id'>) };
}

// ── Mark Interest (soft register) ────────────────────────────────────────────

export async function markInterest(eventId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');
  await updateDoc(doc(db, 'events', eventId), {
    registeredUsers: arrayUnion(user.uid),
  });
}

export async function unmarkInterest(eventId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');
  await updateDoc(doc(db, 'events', eventId), {
    registeredUsers: arrayRemove(user.uid),
  });
}