// firebase/eventService.ts

import {
  collection, addDoc, getDocs, getDoc, doc,
  query, orderBy, where, serverTimestamp,
  updateDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export type Event = {
  id: string;
  title: string;
  venue: string;
  time: string;
  club: string;
  category: string;
  description: string;
  registerLink: string;
  registeredUsers: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
};

// ── Create Event (saved as pending) ──────────────────────────────────────────

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
    status: 'pending', // ← admin must approve before it shows publicly
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// ── Fetch only APPROVED events (for home screen) ──────────────────────────────

export async function fetchEvents(): Promise<Event[]> {
  const q = query(
    collection(db, 'events'),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Event, 'id'>),
  }));
}

// ── Fetch ALL events (for admin panel) ───────────────────────────────────────

export async function fetchAllEvents(): Promise<Event[]> {
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

// ── Approve / Reject Event (admin only) ──────────────────────────────────────

export async function updateEventStatus(eventId: string, status: 'approved' | 'rejected') {
  await updateDoc(doc(db, 'events', eventId), { status });
}

// ── Mark Interest ─────────────────────────────────────────────────────────────

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