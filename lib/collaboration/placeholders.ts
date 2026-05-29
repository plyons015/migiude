import type { CloudSyncMeta, CollaboratorAppend } from "@/lib/collaboration/types";

/** Demo appends shown until Firestore subcollection + friends list ship. */
export function placeholderCollaboratorAppends(
  meetingId: string,
): CollaboratorAppend[] {
  return [
    {
      id: `append_demo_${meetingId}_1`,
      authorUid: "friend-placeholder",
      authorDisplayName: "Collaborator (preview)",
      body: "Client prefers option B — updated todo.",
      createdAt: Date.now() - 3600_000,
      status: "pending",
    },
  ];
}

export function formatSyncStatus(meta: CloudSyncMeta): string {
  if (!meta.isCloud) return "Local only";
  if ((meta.pendingOfflineAppends ?? 0) > 0) {
    return `${meta.pendingOfflineAppends} append(s) queued`;
  }
  if (meta.lastSyncedAt) {
    return `Synced ${new Date(meta.lastSyncedAt).toLocaleString()}`;
  }
  return "On cloud";
}
