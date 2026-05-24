import { FieldValue, getFirestore } from "firebase-admin/firestore";

export const ADMIN_REASON_CODES = [
  "abuse",
  "billing_dispute",
  "duplicate_account",
  "gdpr_erasure",
  "retention_policy",
  "security_incident",
  "support_request",
  "policy_violation",
  "other",
] as const;

export type AdminReasonCode = (typeof ADMIN_REASON_CODES)[number];

export type AdminAuditAction =
  | "user.suspend"
  | "user.unsuspend"
  | "user.plan_change"
  | "user.trial_change"
  | "user.notes_update"
  | "user.role_change"
  | "user.delete.requested"
  | "user.delete.completed"
  | "support.resolve"
  | "support.reopen"
  | "support.email_sent"
  | "flag.resolve"
  | "admin.config_update"
  | "plan.config_update"
  | "plan.config_reset"
  | "org.create"
  | "org.update"
  | "org.member_add"
  | "org.member_remove";

export type WriteAuditInput = {
  actorUid: string;
  actorEmail: string;
  action: AdminAuditAction;
  targetUid?: string | null;
  targetEmail?: string | null;
  reasonCode?: AdminReasonCode;
  reasonText?: string;
  referenceId?: string;
  snapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export async function writeAdminAuditLog(input: WriteAuditInput): Promise<string> {
  const db = getFirestore();
  const ref = db.collection("adminAuditLog").doc();
  await ref.set({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });
  return ref.id;
}

export async function countUserData(uid: string): Promise<Record<string, number>> {
  const db = getFirestore();
  const subs = ["notes", "todos", "meetings", "meetingAppends"] as const;
  const counts: Record<string, number> = {};
  for (const sub of subs) {
    const snap = await db.collection(`users/${uid}/${sub}`).count().get();
    counts[sub] = snap.data().count;
  }
  const tickets = await db
    .collection("supportTickets")
    .where("uid", "==", uid)
    .count()
    .get();
  counts.supportTickets = tickets.data().count;
  return counts;
}
