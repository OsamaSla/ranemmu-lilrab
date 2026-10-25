/**
 * Firestore feedback collection operations.
 */
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export const FEEDBACK_COLLECTION = 'feedbacks';

export interface Feedback {
  id?: string;
  rating: number;
  category: string;
  comment: string;
  status: 'pending' | 'in_progress' | 'completed';
  adminNotes?: string;
  createdAt?: unknown;
}

export async function submitFeedback(
  data: Omit<Feedback, 'id' | 'status' | 'createdAt' | 'adminNotes'>
): Promise<string | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), {
      ...data,
      status: 'pending',
      adminNotes: '',
      createdAt: serverTimestamp(),
    } as DocumentData);
    return docRef.id;
  } catch {
    return null;
  }
}

export async function fetchFeedbacks(statusFilter?: string): Promise<(Feedback & { id: string })[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  try {
    const ref = collection(db, FEEDBACK_COLLECTION);
    const q = statusFilter && statusFilter !== 'all'
      ? query(ref, where('status', '==', statusFilter), orderBy('createdAt', 'desc'))
      : query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as (Feedback & { id: string })[]);
  } catch {
    return [];
  }
}

export async function updateFeedbackStatus(id: string, status: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    await updateDoc(doc(db, FEEDBACK_COLLECTION, id), { status });
    return true;
  } catch {
    return false;
  }
}

export async function updateFeedbackNotes(id: string, notes: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    await updateDoc(doc(db, FEEDBACK_COLLECTION, id), { adminNotes: notes });
    return true;
  } catch {
    return false;
  }
}

export async function deleteFeedback(id: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    await deleteDoc(doc(db, FEEDBACK_COLLECTION, id));
    return true;
  } catch {
    return false;
  }
}
