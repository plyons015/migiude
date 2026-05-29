/** Collaborator access — full team roles come later. */
export type CollaboratorPermission = "view" | "view_append" | "edit";

export type SharedWithEntry = {
  uid: string;
  email?: string;
  displayName?: string;
  permission: CollaboratorPermission;
};

/** Future: share workspace to a group (v1 defers implementation). */
export type GroupShareRef = {
  groupId: string;
  groupName?: string;
  permission: CollaboratorPermission;
};

/** Cloud workspace metadata (Firestore + rules in a later phase). */
export type CloudSyncMeta = {
  isCloud: boolean;
  ownerUid: string;
  sharedWith: SharedWithEntry[];
  /** Populated when group sharing ships. */
  sharedWithGroups?: GroupShareRef[];
  lastSyncedAt?: number;
  /** Appends queued while offline — synced on reconnect. */
  pendingOfflineAppends?: number;
};

/** Threaded refinement from a collaborator (subcollection placeholder). */
export type CollaboratorAppend = {
  id: string;
  authorUid: string;
  authorDisplayName: string;
  body: string;
  createdAt: number;
  /** Owner can accept, reply, or ignore. */
  status?: "pending" | "accepted" | "ignored";
  replyToId?: string;
};

export const DEFAULT_CLOUD_META = (
  ownerUid: string,
): CloudSyncMeta => ({
  isCloud: false,
  ownerUid,
  sharedWith: [],
  pendingOfflineAppends: 0,
});
