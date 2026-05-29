import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { TeamsBotJobStatus } from "./types";

const INTEGRATION_DOC = (uid: string) => `userIntegrations/${uid}`;

export type StoredMicrosoftIntegration = {
  provider: "microsoft";
  displayName?: string;
  email?: string;
  tenantId?: string;
  microsoftUserId?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  connectedAt: number;
  updatedAt: number;
};

export async function readMicrosoftIntegration(
  uid: string,
): Promise<StoredMicrosoftIntegration | null> {
  const snap = await getFirestore().doc(INTEGRATION_DOC(uid)).get();
  const d = snap.data();
  if (!d || d.provider !== "microsoft") return null;
  if (!d.refreshToken || !d.accessToken) return null;
  return d as StoredMicrosoftIntegration;
}

export async function writeMicrosoftIntegration(
  uid: string,
  data: Omit<StoredMicrosoftIntegration, "provider" | "connectedAt" | "updatedAt">,
): Promise<void> {
  const now = Date.now();
  await getFirestore()
    .doc(INTEGRATION_DOC(uid))
    .set(
      {
        provider: "microsoft",
        ...data,
        connectedAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
}

export async function deleteMicrosoftIntegration(uid: string): Promise<void> {
  await getFirestore().doc(INTEGRATION_DOC(uid)).delete();
}

export async function saveOAuthState(
  state: string,
  uid: string,
  redirectUri: string,
): Promise<void> {
  await getFirestore()
    .doc(`oauthStates/${state}`)
    .set({
      uid,
      redirectUri,
      provider: "microsoft",
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
}

export async function consumeOAuthState(
  state: string,
): Promise<{ uid: string; redirectUri: string } | null> {
  const ref = getFirestore().doc(`oauthStates/${state}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  await ref.delete();
  if ((d.expiresAt as number) < Date.now()) return null;
  return { uid: d.uid as string, redirectUri: d.redirectUri as string };
}

export type TeamsBotJobRecord = {
  uid: string;
  status: TeamsBotJobStatus;
  meetingUrl: string;
  meetingTitle?: string;
  migiudeMeetingId?: string;
  estimatedMinutes: number;
  error?: string;
  workerDispatchedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export async function createTeamsBotJob(
  input: Omit<TeamsBotJobRecord, "createdAt" | "updatedAt" | "status"> & {
    status?: TeamsBotJobStatus;
  },
): Promise<string> {
  const ref = getFirestore().collection("teamsBotJobs").doc();
  const now = Date.now();
  await ref.set({
    ...input,
    status: input.status ?? "queued",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function markJobDispatched(jobId: string): Promise<void> {
  await getFirestore()
    .doc(`teamsBotJobs/${jobId}`)
    .set(
      {
        workerDispatchedAt: Date.now(),
        status: "joining",
        updatedAt: Date.now(),
      },
      { merge: true },
    );
}

export async function readTeamsBotJob(
  jobId: string,
): Promise<(TeamsBotJobRecord & { id: string }) | null> {
  const snap = await getFirestore().doc(`teamsBotJobs/${jobId}`).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as TeamsBotJobRecord) };
}

export async function incrementTeamsBotUsage(
  uid: string,
  joins: number,
  minutes: number,
): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);
  const ref = getFirestore().doc(`usageMonthly/${month}/users/${uid}`);
  await ref.set(
    {
      teamsBotJoins: FieldValue.increment(joins),
      teamsBotMinutes: FieldValue.increment(minutes),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function readTeamsBotUsage(uid: string): Promise<{
  teamsBotJoins: number;
  teamsBotMinutes: number;
}> {
  const month = new Date().toISOString().slice(0, 7);
  const snap = await getFirestore()
    .doc(`usageMonthly/${month}/users/${uid}`)
    .get();
  const d = snap.data() ?? {};
  return {
    teamsBotJoins: (d.teamsBotJoins as number) ?? 0,
    teamsBotMinutes: (d.teamsBotMinutes as number) ?? 0,
  };
}
