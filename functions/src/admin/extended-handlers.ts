import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import {
  ADMIN_REASON_CODES,
  countUserData,
  writeAdminAuditLog,
} from "./audit";
import { assertAdmin } from "./assert-admin";
import {
  getAdminConfig,
  getAdminEmailsFromEnv,
  setAdminConfig,
} from "./config";
import { purgeUserData } from "./delete-user";
import { buildRetentionSeries } from "./retention";
import {
  adminSecrets,
  bindAdminEmailsEnv,
} from "./secrets";
import { formatZodError } from "./zod-helpers";

const extendedOptions = {
  invoker: "public" as const,
  secrets: adminSecrets,
};

export const adminListAuditLog = onCall(extendedOptions, async (request) => {
  bindAdminEmailsEnv();
  await assertAdmin(request);
  const schema = z.object({ limit: z.number().int().min(1).max(100).default(50) });
  const parsed = schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const snap = await getFirestore()
    .collection("adminAuditLog")
    .orderBy("createdAtMs", "desc")
    .limit(parsed.data.limit)
    .get();
  return {
    entries: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
});

export const adminDeleteUser = onCall(extendedOptions, async (request) => {
  bindAdminEmailsEnv();
  const actor = await assertAdmin(request);
  const schema = z.object({
    uid: z.string().min(1),
    confirmEmail: z.string().email(),
    reasonCode: z.enum(ADMIN_REASON_CODES),
    reasonText: z.string().trim().min(3).max(500),
  });
  const parsed = schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", formatZodError(parsed.error));
  }
  const { uid, confirmEmail, reasonCode, reasonText } = parsed.data;
  if (uid === actor.uid) {
    throw new HttpsError(
      "failed-precondition",
      "You cannot delete your own admin account.",
    );
  }

  const authUser = await import("firebase-admin/auth")
    .then((m) => m.getAuth().getUser(uid))
    .catch(() => null);
  if (!authUser) {
    throw new HttpsError("not-found", "User not found.");
  }
  const targetEmail = (authUser.email ?? "").trim().toLowerCase();
  if (targetEmail !== confirmEmail.trim().toLowerCase()) {
    throw new HttpsError(
      "failed-precondition",
      "Confirmation email does not match the account.",
    );
  }

  const dataCounts = await countUserData(uid);
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "user.delete.requested",
    targetUid: uid,
    targetEmail,
    reasonCode,
    reasonText,
    snapshot: { dataCounts, authDisabled: authUser.disabled },
  });

  const manifest = await purgeUserData(uid);

  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "user.delete.completed",
    targetUid: uid,
    targetEmail,
    reasonCode,
    reasonText,
    snapshot: manifest as unknown as Record<string, unknown>,
  });

  return { ok: true, manifest };
});

export const adminGetRetention = onCall(extendedOptions, async (request) => {
  bindAdminEmailsEnv();
  await assertAdmin(request);
  const schema = z.object({ days: z.number().int().min(7).max(90).default(28) });
  const parsed = schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const series = await buildRetentionSeries(parsed.data.days);
  return { series };
});

export const adminGetAdminConfig = onCall(extendedOptions, async (request) => {
  bindAdminEmailsEnv();
  await assertAdmin(request);
  const config = await getAdminConfig();
  const envEmails = getAdminEmailsFromEnv();
  return {
    adminEmails: config.adminEmails ?? [],
    envAdminEmails: envEmails,
    adminIpAllowlist: config.adminIpAllowlist ?? [],
    envIpAllowlist: process.env.ADMIN_IP_ALLOWLIST?.trim() ?? "",
  };
});

export const adminUpdateAdminConfig = onCall(
  extendedOptions,
  async (request) => {
    bindAdminEmailsEnv();
    const actor = await assertAdmin(request);
    const schema = z.object({
      adminEmails: z.array(z.string().email()).max(20).optional(),
      adminIpAllowlist: z.array(z.string().min(3)).max(20).optional(),
    });
    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", formatZodError(parsed.error));
    }

    const envEmails = getAdminEmailsFromEnv();
    const nextFirestore = parsed.data.adminEmails?.map((e) =>
      e.trim().toLowerCase(),
    );
    const merged = new Set([
      ...envEmails,
      ...(nextFirestore ?? (await getAdminConfig()).adminEmails ?? []),
    ]);
    if (merged.size === 0) {
      throw new HttpsError(
        "failed-precondition",
        "At least one admin email must remain (env or Firestore).",
      );
    }

    await setAdminConfig({
      ...(nextFirestore ? { adminEmails: nextFirestore } : {}),
      ...(parsed.data.adminIpAllowlist
        ? { adminIpAllowlist: parsed.data.adminIpAllowlist }
        : {}),
    });

    await writeAdminAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "admin.config_update",
      snapshot: {
        adminEmails: nextFirestore,
        adminIpAllowlist: parsed.data.adminIpAllowlist,
      },
    });

    return { ok: true };
  },
);

export const adminListOrgs = onCall(extendedOptions, async (request) => {
  bindAdminEmailsEnv();
  await assertAdmin(request);
  const snap = await getFirestore()
    .collection("orgs")
    .orderBy("createdAtMs", "desc")
    .limit(50)
    .get();
  const orgs = await Promise.all(
    snap.docs.map(async (doc) => {
      const members = await doc.ref.collection("members").count().get();
      return {
        id: doc.id,
        ...doc.data(),
        memberCount: members.data().count,
      };
    }),
  );
  return { orgs };
});

const orgSchema = z.object({
  name: z.string().trim().min(2).max(120),
  seatLimit: z.number().int().min(1).max(500).default(10),
  plan: z.enum(["power", "business"]).default("power"),
});

export const adminCreateOrg = onCall(extendedOptions, async (request) => {
  bindAdminEmailsEnv();
  const actor = await assertAdmin(request);
  const parsed = orgSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", formatZodError(parsed.error));
  }
  const ref = getFirestore().collection("orgs").doc();
  await ref.set({
    ...parsed.data,
    createdAtMs: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
  });
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "org.create",
    referenceId: ref.id,
    snapshot: parsed.data as unknown as Record<string, unknown>,
  });
  return { ok: true, orgId: ref.id };
});

export const adminUpdateOrg = onCall(extendedOptions, async (request) => {
  bindAdminEmailsEnv();
  const actor = await assertAdmin(request);
  const schema = orgSchema.partial().extend({ orgId: z.string().min(1) });
  const parsed = schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", formatZodError(parsed.error));
  }
  const { orgId, ...patch } = parsed.data;
  const ref = getFirestore().doc(`orgs/${orgId}`);
  if (!(await ref.get()).exists) {
    throw new HttpsError("not-found", "Organization not found.");
  }
  await ref.set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "org.update",
    referenceId: orgId,
    snapshot: patch as Record<string, unknown>,
  });
  return { ok: true };
});

export const adminAddOrgMember = onCall(extendedOptions, async (request) => {
  bindAdminEmailsEnv();
  const actor = await assertAdmin(request);
  const schema = z.object({
    orgId: z.string().min(1),
    uid: z.string().min(1),
    role: z.enum(["owner", "member"]).default("member"),
  });
  const parsed = schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", formatZodError(parsed.error));
  }
  const { orgId, uid, role } = parsed.data;
  const db = getFirestore();
  const org = await db.doc(`orgs/${orgId}`).get();
  if (!org.exists) {
    throw new HttpsError("not-found", "Organization not found.");
  }
  const seatLimit = (org.data()?.seatLimit as number | undefined) ?? 10;
  const members = await db.collection(`orgs/${orgId}/members`).count().get();
  if (members.data().count >= seatLimit) {
    throw new HttpsError("failed-precondition", "Organization seat limit reached.");
  }
  const profile = await db.doc(`userProfiles/${uid}`).get();
  if (!profile.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }
  await db.doc(`orgs/${orgId}/members/${uid}`).set({
    uid,
    role,
    email: profile.data()?.email ?? null,
    joinedAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`userProfiles/${uid}`).set(
    { orgId, plan: "power", updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "org.member_add",
    targetUid: uid,
    referenceId: orgId,
    snapshot: { role },
  });
  return { ok: true };
});

export const adminRemoveOrgMember = onCall(extendedOptions, async (request) => {
  bindAdminEmailsEnv();
  const actor = await assertAdmin(request);
  const schema = z.object({ orgId: z.string().min(1), uid: z.string().min(1) });
  const parsed = schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", formatZodError(parsed.error));
  }
  const { orgId, uid } = parsed.data;
  await getFirestore().doc(`orgs/${orgId}/members/${uid}`).delete();
  await getFirestore().doc(`userProfiles/${uid}`).set(
    { orgId: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "org.member_remove",
    targetUid: uid,
    referenceId: orgId,
  });
  return { ok: true };
});

export const adminListClientErrors = onCall(extendedOptions, async (request) => {
  bindAdminEmailsEnv();
  await assertAdmin(request);
  const schema = z.object({ limit: z.number().int().min(1).max(100).default(50) });
  const parsed = schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const snap = await getFirestore()
    .collection("clientErrors")
    .orderBy("createdAtMs", "desc")
    .limit(parsed.data.limit)
    .get();
  return { errors: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
});
