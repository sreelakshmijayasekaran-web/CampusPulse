// firebase/notificationService.ts

import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Send a notification to a single user.
 */
export async function sendNotificationToUser(
  uid: string,
  title: string,
  body: string,
  extras?: { type?: string; eventId?: string }
) {
  await addDoc(collection(db, 'notifications'), {
    uid,
    title,
    body,
    read: false,
    createdAt: serverTimestamp(),
    ...extras,
  });
}

/**
 * Broadcast a notification to ALL students (role === 'student').
 * Used when a new event is approved or created.
 */
export async function broadcastToAllStudents(
  title: string,
  body: string,
  extras?: { type?: string; eventId?: string }
) {
  const q = query(collection(db, 'users'), where('role', '==', 'student'));
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  snap.docs.forEach((userDoc) => {
    const ref = doc(collection(db, 'notifications'));
    batch.set(ref, {
      uid: userDoc.id,
      title,
      body,
      read: false,
      createdAt: serverTimestamp(),
      ...extras,
    });
  });
  await batch.commit();
}

/**
 * Broadcast a notification to ALL students EXCEPT the organizer who created the event.
 * Used when an event is approved — organizer doesn't need to be notified about their own event.
 */
export async function broadcastNewEventToStudents(
  eventId: string,
  eventTitle: string,
  organizerUid: string,
  club: string
) {
  const q = query(collection(db, 'users'), where('role', '==', 'student'));
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  snap.docs.forEach((userDoc) => {
    if (userDoc.id === organizerUid) return; // skip organizer
    const ref = doc(collection(db, 'notifications'));
    batch.set(ref, {
      uid: userDoc.id,
      title: `🎉 New Event: ${eventTitle}`,
      body: `${club} just posted a new event. Tap to view details and register!`,
      read: false,
      createdAt: serverTimestamp(),
      type: 'new_event',
      eventId,
    });
  });

  // Also send to all other organizers (excluding the creator)
  const orgQ = query(collection(db, 'users'), where('role', '==', 'organizer'));
  const orgSnap = await getDocs(orgQ);
  orgSnap.docs.forEach((userDoc) => {
    if (userDoc.id === organizerUid) return;
    const ref = doc(collection(db, 'notifications'));
    batch.set(ref, {
      uid: userDoc.id,
      title: `🎉 New Event: ${eventTitle}`,
      body: `${club} just posted a new event. Check it out!`,
      read: false,
      createdAt: serverTimestamp(),
      type: 'new_event',
      eventId,
    });
  });

  await batch.commit();
}

/**
 * Send a deadline reminder to all users who marked interest in the event.
 * This should be called when a user registers, and checked server-side ideally.
 * For client-side: call this when registering if deadline is within 12h.
 */
export async function sendDeadlineReminderToRegistered(
  eventId: string,
  eventTitle: string,
  registeredUserIds: string[],
  deadline: string
) {
  if (!registeredUserIds.length) return;

  const batch = writeBatch(db);
  registeredUserIds.forEach((uid) => {
    const ref = doc(collection(db, 'notifications'));
    batch.set(ref, {
      uid,
      title: `⏰ Deadline Soon: ${eventTitle}`,
      body: `Registration closes at ${deadline}. Make sure you've completed all registration steps!`,
      read: false,
      createdAt: serverTimestamp(),
      type: 'deadline_reminder',
      eventId,
    });
  });
  await batch.commit();
}