/** Friends & groups (v1) — assign friends to groups; share meetings by group. */

export type FriendRecord = {
  id: string;
  email: string;
  displayName?: string;
  /** Set when the friend has a Ude account (invites later). */
  uid?: string;
  createdAt: number;
  updatedAt: number;
};

export type GroupRecord = {
  id: string;
  name: string;
  /** {@link FriendRecord.id} values assigned to this group. */
  friendIds: string[];
  /** Resolved member UIDs when friends accept (sync later). */
  memberUids: string[];
  createdAt: number;
  updatedAt: number;
};

export type GroupMemberRef = {
  uid: string;
  displayName?: string;
  email?: string;
};
