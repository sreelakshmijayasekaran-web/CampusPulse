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
  registeredUsers: string[];   // fully registered users
  interestedUsers?: string[];  // users who only marked interest
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  deadline?: string;
  seatLimit?: number | null;
  posterUrl?: string | null;
   eventDate?: string;
};

// ── Create Event ──────────────────────────────────────────────────────────────

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
    interestedUsers: [],
    status: 'pending',
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// ── Update Event ──────────────────────────────────────────────────────────────

export async function updateEvent(
  eventId: string,
  data: Partial<Omit<Event, 'id' | 'createdBy' | 'registeredUsers' | 'interestedUsers' | 'status'>>
) {
  await updateDoc(doc(db, 'events', eventId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── Fetch only APPROVED events (home screen) ──────────────────────────────────

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

// ── Fetch ALL events (admin panel) ────────────────────────────────────────────

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

// ── Fetch events by the logged-in organizer ───────────────────────────────────

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

// ── Fetch events the current user has REGISTERED for ─────────────────────────
// (only registeredUsers[], not interestedUsers)

export async function fetchMyRegisteredEvents(): Promise<Event[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');

  const q = query(
    collection(db, 'events'),
    where('registeredUsers', 'array-contains', user.uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Event, 'id'>),
  }));
}

// ── Approve / Reject Event (admin) ────────────────────────────────────────────

export async function updateEventStatus(eventId: string, status: 'approved' | 'rejected') {
  await updateDoc(doc(db, 'events', eventId), { status });
}

// ── Mark Interest (adds to interestedUsers only, NOT registeredUsers) ─────────

export async function markInterest(eventId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');

  await updateDoc(doc(db, 'events', eventId), {
    interestedUsers: arrayUnion(user.uid),
  });
}

// ── Unmark Interest / Unregister (removes from BOTH arrays) ──────────────────

export async function unmarkInterest(eventId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');
  await updateDoc(doc(db, 'events', eventId), {
    registeredUsers: arrayRemove(user.uid),
    interestedUsers: arrayRemove(user.uid),
  });
}

// ── Deadline helpers ──────────────────────────────────────────────────────────

export function parseDeadline(deadlineStr: string): Date | null {
  if (!deadlineStr?.trim()) return null;
  const d = new Date(deadlineStr);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export function isDeadlineWithin12Hours(deadlineStr?: string): boolean {
  if (!deadlineStr) return false;
  const deadline = parseDeadline(deadlineStr);
  if (!deadline) return false;
  const now = Date.now();
  const diff = deadline.getTime() - now;
  return diff > 0 && diff <= 12 * 60 * 60 * 1000;
}