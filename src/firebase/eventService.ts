// firebase/eventService.ts
// Handles creating and reading events from the "events" collection in Firestore

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// ── Create Event ─────────────────────────────────────────────────────────────
// Saves a new event to Firestore → events/{auto-id}
// Only call this if the logged-in user is an organizer.

export async function createEvent(
  title: string,
  venue: string,
  time: string,
  club: string
) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in to create an event.');

  const docRef = await addDoc(collection(db, 'events'), {
    title,
    venue,
    time,
    club,
    createdBy: user.uid,         // links event to the organizer
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// ── Fetch All Events ─────────────────────────────────────────────────────────
// Returns all events sorted by creation time (newest first)

export type Event = {
  id: string;
  title: string;
  venue: string;
  time: string;
  club: string;
  createdBy: string;
};

export async function fetchEvents(): Promise<Event[]> {
  const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Event, 'id'>),
  }));
}