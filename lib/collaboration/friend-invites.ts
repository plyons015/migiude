import { listLocalFriends } from "@/lib/data/local-db";
import { createId } from "@/lib/data/ids";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isLocalOnlyMode } from "@/lib/settings/preferences";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

export type FriendInviteRecord = {
  status: "pending" | "used";
  inviterUid: string;
  targetEmail: string;
  friendDisplayName?: string;
  personalMessage?: string;
  createdAt: number;
  expiresAt: number;
  acceptedByUid?: string;
  acceptedAt?: number;
  usedAt?: number;
};

export type CreateFriendInviteInput = {
  inviterUid: string;
  targetEmail: string;
  /** Shown on inviter's list after accept (optional). */
  friendDisplayName?: string;
  /** Optional note from inviter (max 50 chars). */
  personalMessage?: string;
  expiresInDays?: number;
};

function randomTokenHex(bytes = 32): string {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    return (
      Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)
    );
  }
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Firestore rejects `undefined`; omit those keys before any write. */
function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const value = obj[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

export function friendInviteShareText(options: {
  personalMessage?: string;
  link: string;
}): string {
  const base = "Join me as a friend on Ude. Click the link now.";
  const note = options.personalMessage?.trim();
  if (!note) {
    return `${base}\n\n${options.link}`;
  }
  return `${base}\n\n${note}\n\n${options.link}`;
}

export function friendInviteUrl(token: string, targetEmail: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    kind: "friend",
    token,
    email: normalizeEmail(targetEmail),
  });
  return `${origin}/accept/?${params.toString()}`;
}

async function inviterHasFriendEmail(
  inviterUid: string,
  targetEmail: string,
): Promise<boolean> {
  const local = await listLocalFriends(inviterUid);
  if (local.some((f) => normalizeEmail(f.email) === targetEmail)) {
    return true;
  }

  const db = getFirebaseDb();
  if (!db) return false;

  const snap = await getDocs(
    query(
      collection(db, "users", inviterUid, "friends"),
      where("email", "==", targetEmail),
      limit(1),
    ),
  );
  return !snap.empty;
}

export async function createFriendInvite(
  input: CreateFriendInviteInput,
): Promise<{ token: string; link: string }> {
  if (isLocalOnlyMode()) {
    throw new Error("Friend invites require cloud sync. Turn off local-only mode.");
  }

  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase is not configured.");

  const targetEmail = normalizeEmail(input.targetEmail);
  if (!targetEmail.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  const inviterEmail = getAuth().currentUser?.email;
  if (inviterEmail && normalizeEmail(inviterEmail) === targetEmail) {
    throw new Error("You can't invite yourself.");
  }

  const personalMessage = input.personalMessage?.trim().slice(0, 50);
  const friendDisplayName = input.friendDisplayName?.trim();
  const expiresInDays = input.expiresInDays ?? 14;
  const now = Date.now();
  const expiresAt = now + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000;

  if (await inviterHasFriendEmail(input.inviterUid, targetEmail)) {
    throw new Error("This person is already on your friends list.");
  }

  const token = randomTokenHex(32);
  const payload = omitUndefined({
    status: "pending" as const,
    inviterUid: input.inviterUid,
    targetEmail,
    createdAt: now,
    expiresAt,
    friendDisplayName: friendDisplayName || undefined,
    personalMessage: personalMessage || undefined,
  });

  await setDoc(doc(db, "friendInvites", token), payload);

  return { token, link: friendInviteUrl(token, targetEmail) };
}

export async function acceptFriendInvite(input: {
  token: string;
  userId: string;
  userEmail: string | null;
  displayName?: string | null;
}): Promise<{ inviterUid: string }> {
  if (isLocalOnlyMode()) {
    throw new Error("Friend invites require cloud sync.");
  }

  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase is not configured.");

  const email = input.userEmail ? normalizeEmail(input.userEmail) : "";
  if (!email) {
    throw new Error("Sign in with the email address that received the invite.");
  }

  const inviteRef = doc(db, "friendInvites", input.token);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) {
    throw new Error("Invite not found or expired.");
  }

  const invite = inviteSnap.data() as FriendInviteRecord;
  if (!invite.inviterUid || !invite.targetEmail) {
    throw new Error("Invalid invite.");
  }

  const targetEmail = normalizeEmail(invite.targetEmail);
  if (targetEmail !== email) {
    throw new Error(
      "This invite was sent to a different email. Sign in with that address.",
    );
  }

  if (invite.status === "used") {
    if (invite.acceptedByUid === input.userId) {
      return { inviterUid: invite.inviterUid };
    }
    throw new Error("Invite has already been used.");
  }

  if (invite.status !== "pending") {
    throw new Error("Invite is no longer valid.");
  }

  if (!invite.expiresAt || invite.expiresAt <= Date.now()) {
    throw new Error("Invite has expired.");
  }

  if (await inviterHasFriendEmail(invite.inviterUid, targetEmail)) {
    await updateDoc(inviteRef, {
      status: "used",
      acceptedByUid: input.userId,
      acceptedAt: Date.now(),
      usedAt: Date.now(),
    });
    return { inviterUid: invite.inviterUid };
  }

  const now = Date.now();
  const friendId = createId("friend");
  const friendRef = doc(db, "users", invite.inviterUid, "friends", friendId);
  const batch = writeBatch(db);

  batch.set(friendRef, {
    email: targetEmail,
    uid: input.userId,
    displayName:
      input.displayName?.trim() ||
      invite.friendDisplayName?.trim() ||
      null,
    inviteToken: input.token,
    createdAt: now,
    updatedAt: now,
  });

  batch.update(inviteRef, {
    status: "used",
    acceptedByUid: input.userId,
    acceptedAt: now,
    usedAt: now,
  });

  await batch.commit();

  return { inviterUid: invite.inviterUid };
}
