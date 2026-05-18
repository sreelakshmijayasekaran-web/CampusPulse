// firebase/eventService.ts

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
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
  // new fields
  deadline?: string;
  seatLimit?: number | null;
  posterUrl?: string | null;
};

// ── Create Event (saved as pending) ──────────────────────────────────────────

export async function createEvent(data: {
  title: string;
  venue: string;
  time: string;
  club: string;
  category: string;
  description: string;
  registerLink: string;
  deadline: string;
  seatLimit: number | null;
  posterUrl: string | null;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in to create an event.');

  const docRef = await addDoc(collection(db, 'events'), {
    ...data,
    registeredUsers: [],
    status: 'pending',
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// ── Update Event (organizer edit) ─────────────────────────────────────────────

export async function updateEvent(eventId: string, data: Partial<Omit<Event, 'id' | 'createdBy' | 'registeredUsers' | 'status'>>) {
  await updateDoc(doc(db, 'events', eventId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
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

// ── Fetch events created by the logged-in organizer ───────────────────────────

export async function fetchMyEvents(): Promise<Event[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');
  const q = query(
    collection(db, 'events'),
    where('createdBy', '==', user.uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Event, 'id'>),
  }));
}

// ── Approve / Reject Event (admin only) ──────────────────────────────────────

export async function updateEventStatus(eventId: string, status: 'approved' | 'rejected') {
  await updateDoc(doc(db, 'events', eventId), { status });
}

// ── Mark Interest ─────────────────────────────────────────────────────────────

export async function markInterest(eventId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');

  const eventSnap = await getDoc(doc(db, 'events', eventId));
  if (!eventSnap.exists()) throw new Error('Event not found.');

  const data = eventSnap.data();
  const seatLimit = data.seatLimit ?? null;
  const registeredUsers: string[] = data.registeredUsers ?? [];

  // Check seat limit
  if (seatLimit !== null && registeredUsers.length >= seatLimit) {
    throw new Error('This event is full. No seats available.');
  }

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