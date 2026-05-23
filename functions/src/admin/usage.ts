import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ensureFirebaseAdmin } from "../firebase-admin-app";

export type UsageField = "aiCalls" | "cloudSttChunks" | "meetings";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function touchUserProfile(
  uid: string,
  patch: {
    email?: string | null;
    platform?: string;
    lastSeenAt?: number;
  },
): Promise<void> {
  ensureFirebaseAdmin();
  const db = getFirestore();
  await db.doc(`userProfiles/${uid}`).set(
    {
      ...patch,
      lastSeenAt: patch.lastSeenAt ?? Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function recordUsage(
  uid: string,
  field: UsageField,
  amount = 1,
  extra?: { cloudSttBytes?: number },
): Promise<void> {
  const day = todayKey();
  const db = getFirestore();
  const usageRef = db.doc(`usageDaily/${day}/users/${uid}`);
  const updates: Record<string, unknown> = {
    [field]: FieldValue.increment(amount),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (extra?.cloudSttBytes) {
    updates.cloudSttBytes = FieldValue.increment(extra.cloudSttBytes);
  }
  await usageRef.set(updates, { merge: true });

  // Auto-flag heavy cloud STT (counseling abuse / cost alert)
  if (field === "cloudSttChunks" && amount > 0) {
    const snap = await usageRef.get();
    const chunks = (snap.data()?.cloudSttChunks as number | undefined) ?? 0;
    if (chunks >= 400) {
      const flagId = `${uid}_${day}`;
      const flagRef = db.doc(`flags/${flagId}`);
      const existing = await flagRef.get();
      if (!existing.exists) {
        await flagRef.set({
          uid,
          day,
          reason: "high_cloud_stt_volume",
          cloudSttChunks: chunks,
          status: "open",
          createdAt: FieldValue.serverTimestamp(),
        });
        logger.warn("usage.flag.created", { uid, day, chunks });
      }
    }
  }
}

export async function aggregateTodayUsage(): Promise<{
  aiCalls: number;
  cloudSttChunks: number;
  meetings: number;
  activeUsers: number;
}> {
  const day = todayKey();
  const db = getFirestore();
  const snap = await db.collection(`usageDaily/${day}/users`).get();
  let aiCalls = 0;
  let cloudSttChunks = 0;
  let meetings = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    aiCalls += (d.aiCalls as number) ?? 0;
    cloudSttChunks += (d.cloudSttChunks as number) ?? 0;
    meetings += (d.meetings as number) ?? 0;
  }
  return {
    aiCalls,
    cloudSttChunks,
    meetings,
    activeUsers: snap.size,
  };
}
