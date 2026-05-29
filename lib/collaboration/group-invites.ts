import { ensureGroupWorkspace } from "@/lib/collaboration/group-workspaces";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isLocalOnlyMode } from "@/lib/settings/preferences";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export type GroupInviteMode = "uid" | "email";

export type CreateGroupInviteInput = {
  ownerUid: string;
  groupId: string;
  mode: GroupInviteMode;
  targetUid?: string;
  targetEmail?: string;
  /**
   * Expiration in days. v1 default is 7 days.
   * Keep this reasonably short to reduce invite token exposure risk.
   */
  expiresInDays?: number;
};

function randomTokenHex(bytes = 32): string {
  // Browser-only usage; Firestore client runs in the browser for this app.
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    // Fallback (less secure) - still better than sequential.
    return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  }
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createGroupInvite(
  input: CreateGroupInviteInput,
): Promise<{ token: string }> {
  if (isLocalOnlyMode()) {
    throw new Error("Sharing is disabled in local-only mode.");
  }

  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase is not configured.");

  const { ownerUid, groupId, mode } = input;
  const expiresInDays = input.expiresInDays ?? 7;
  const now = Date.now();
  const expiresAt = now + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000;

  // Ensure the group workspace exists so owner creation is authorized.
  // v1: memberships are updated on meeting publish / acceptance.
  await ensureGroupWorkspace(ownerUid, groupId, []);

  const token = randomTokenHex(32);

  const payload: Record<string, unknown> = {
    status: "pending",
    createdAt: now,
    expiresAt,
    inviterUid: ownerUid,
    groupId,
    mode,
    targetUid: mode === "uid" ? input.targetUid ?? null : null,
    targetEmail:
      mode === "email"
        ? (input.targetEmail?.trim().toLowerCase() ?? null)
        : null,
  };

  const ref = doc(db, "groupInvites", token);
  await setDoc(ref, payload);

  return { token };
}

export async function acceptGroupInvite(
  input: { token: string; userId: string },
): Promise<{ groupId: string }> {
  if (isLocalOnlyMode()) {
    throw new Error("Sharing is disabled in local-only mode.");
  }

  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase is not configured.");

  const { token, userId } = input;
  const inviteRef = doc(db, "groupInvites", token);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error("Invite not found or expired.");
  }

  const invite = inviteSnap.data() as {
    status?: string;
    expiresAt?: number;
    groupId?: string;
  };

  const groupId = invite.groupId;
  if (!groupId) throw new Error("Invalid invite.");

  if (invite.status !== "pending") {
    throw new Error("Invite has already been used.");
  }

  if (!invite.expiresAt || invite.expiresAt <= Date.now()) {
    throw new Error("Invite has expired.");
  }

  // v1: create/update membership doc (enables Meetings → Shared).
  const memberRef = doc(db, "groupWorkspaces", groupId, "members", userId);
  await setDoc(
    memberRef,
    {
      uid: userId,
      inviteToken: token,
      addedAt: Date.now(),
    },
    { merge: true },
  );

  // Mark invite as used. Rules enforce that status transitions happen
  // only for the invited user.
  await updateDoc(inviteRef, {
    status: "used",
    acceptedByUid: userId,
    acceptedAt: Date.now(),
    usedAt: Date.now(),
  });

  return { groupId };
}

