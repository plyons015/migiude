import { createId } from "@/lib/data/ids";
import type {
  SpeechCorrection,
  SpeechPersonalization,
  SpeechTerm,
} from "@/lib/speech/personalization-types";
import { EMPTY_SPEECH_PERSONALIZATION } from "@/lib/speech/personalization-types";

const DB_NAME = "migiude-speech-personal";
const DB_VERSION = 1;
const STORE = "personalization";

function storageKey(userId: string): string {
  return `user:${userId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function loadSpeechPersonalization(
  userId: string,
): Promise<SpeechPersonalization> {
  if (!userId) return { ...EMPTY_SPEECH_PERSONALIZATION };
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(storageKey(userId));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const raw = request.result as SpeechPersonalization | undefined;
      resolve({
        terms: raw?.terms ?? [],
        corrections: raw?.corrections ?? [],
        updatedAt: raw?.updatedAt ?? 0,
      });
    };
  });
}

async function saveSpeechPersonalization(
  userId: string,
  data: SpeechPersonalization,
): Promise<void> {
  const db = await openDb();
  const payload: SpeechPersonalization = {
    ...data,
    updatedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const request = tx.objectStore(STORE).put(payload, storageKey(userId));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function addSpeechTerm(
  userId: string,
  phrase: string,
  replacement: string,
): Promise<SpeechTerm> {
  const prefs = await loadSpeechPersonalization(userId);
  const term: SpeechTerm = {
    id: createId("term"),
    phrase: phrase.trim(),
    replacement: replacement.trim(),
    createdAt: Date.now(),
  };
  prefs.terms = [
    term,
    ...prefs.terms.filter(
      (t) => t.phrase.toLowerCase() !== term.phrase.toLowerCase(),
    ),
  ].slice(0, 80);
  await saveSpeechPersonalization(userId, prefs);
  return term;
}

export async function removeSpeechTerm(
  userId: string,
  termId: string,
): Promise<void> {
  const prefs = await loadSpeechPersonalization(userId);
  prefs.terms = prefs.terms.filter((t) => t.id !== termId);
  await saveSpeechPersonalization(userId, prefs);
}

export async function rememberSpeechCorrection(
  userId: string,
  from: string,
  to: string,
): Promise<SpeechCorrection> {
  const prefs = await loadSpeechPersonalization(userId);
  const key = from.trim().toLowerCase();
  const existing = prefs.corrections.find(
    (c) => c.from.toLowerCase() === key,
  );
  if (existing) {
    existing.to = to.trim();
    existing.useCount += 1;
    await saveSpeechPersonalization(userId, prefs);
    return existing;
  }
  const correction: SpeechCorrection = {
    id: createId("corr"),
    from: from.trim(),
    to: to.trim(),
    createdAt: Date.now(),
    useCount: 1,
  };
  prefs.corrections = [correction, ...prefs.corrections].slice(0, 120);
  await saveSpeechPersonalization(userId, prefs);
  return correction;
}

export async function removeSpeechCorrection(
  userId: string,
  correctionId: string,
): Promise<void> {
  const prefs = await loadSpeechPersonalization(userId);
  prefs.corrections = prefs.corrections.filter((c) => c.id !== correctionId);
  await saveSpeechPersonalization(userId, prefs);
}

export function clearSpeechPersonalizationDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
