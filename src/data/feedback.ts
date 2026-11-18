/**
 * Firestore feedback collection operations.
 *
 * Every call reports *why* it failed instead of swallowing the exception:
 * a denied write used to look exactly like a slow one, and web has no
 * `Alert.alert`, so the rating form appeared to do nothing at all.
 */
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { notifyFeedbackByEmail } from './web3forms';

const FEEDBACK_COLLECTION = 'feedbacks';

export type FeedbackStatus = 'pending' | 'in_progress' | 'completed';

/**
 * A rating is anonymous; a message carries a return address so the admin can
 * reply by email. Both share one collection and one triage screen.
 */
export type FeedbackKind = 'rating' | 'message';

/** Why a feedback call failed — the UI maps each one to a readable hint. */
export type FeedbackError = 'unconfigured' | 'permission' | 'offline' | 'unknown';

export interface Feedback {
  id?: string;
  kind?: FeedbackKind;
  rating: number;
  category: string;
  comment: string;
  replyEmail?: string;
  status: FeedbackStatus;
  adminNotes?: string;
  createdAt?: unknown;
}

export type SubmitFeedbackResult =
  | { ok: true; id: string }
  | { ok: false; error: FeedbackError };

export type FetchFeedbacksResult =
  | { ok: true; items: (Feedback & { id: string })[] }
  | { ok: false; error: FeedbackError };

/** Maps a Firestore/JS error to the small set of states the UI shows. */
function describeError(error: unknown): FeedbackError {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  switch (code) {
    case 'permission-denied':
    case 'unauthenticated':
      return 'permission';
    case 'unavailable':
    case 'deadline-exceeded':
    case 'network-request-failed':
      return 'offline';
    default:
      return 'unknown';
  }
}

/** Firestore Timestamp → epoch ms; unset/pending values sort last. */
function timestampMillis(value: unknown): number {
  const toMillis = (value as { toMillis?: () => number } | null | undefined)?.toMillis;
  return typeof toMillis === 'function' ? toMillis.call(value) : 0;
}

export async function submitFeedback(data: {
  rating: number;
  category: string;
  comment: string;
  kind?: FeedbackKind;
  replyEmail?: string;
}): Promise<SubmitFeedbackResult> {
  const db = getFirebaseDb();
  if (!db) return { ok: false, error: 'unconfigured' };
  const kind = data.kind ?? 'rating';
  try {
    const record = {
      kind,
      rating: kind === 'message' ? 0 : data.rating,
      category: kind === 'message' ? 'message' : data.category,
      comment: data.comment.slice(0, 500),
      replyEmail: kind === 'message' ? (data.replyEmail ?? '').trim().slice(0, 254) : '',
      status: 'pending',
      adminNotes: '',
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), record as DocumentData);
    // Firestore is the source of truth; the email is a best-effort side effect.
    // A Web3Forms outage must not turn a successful save into a red error.
    notifyFeedbackByEmail({
      kind,
      rating: record.rating,
      category: record.category,
      comment: record.comment,
      replyEmail: record.replyEmail,
      documentId: docRef.id,
    });
    return { ok: true, id: docRef.id };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

/**
 * Lists feedback, newest first. Sorting and status filtering happen on the
 * client on purpose: a `where('status') + orderBy('createdAt')` query needs a
 * composite index, and a missing index fails the whole list with an empty
 * result instead of an obvious error.
 */
export async function fetchFeedbacks(
  statusFilter: FeedbackStatus | 'all' = 'all',
): Promise<FetchFeedbacksResult> {
  const db = getFirebaseDb();
  if (!db) return { ok: false, error: 'unconfigured' };
  try {
    const snap = await getDocs(collection(db, FEEDBACK_COLLECTION));
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Feedback & { id: string })
      .filter((item) => statusFilter === 'all' || item.status === statusFilter)
      .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
    return { ok: true, items };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<boolean> {
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
    await updateDoc(doc(db, FEEDBACK_COLLECTION, id), { adminNotes: notes.slice(0, 1000) });
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
