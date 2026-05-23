import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { assertAdmin } from "./assert-admin";
import { adminEmailsSecret, bindAdminEmailsEnv } from "./secrets";
import { aggregateTodayUsage } from "./usage";

const adminCallOptions = {
  invoker: "public" as const,
  secrets: [adminEmailsSecret],
};

function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

async function countAllUsers(): Promise<number> {
  const auth = getAuth();
  let total = 0;
  let pageToken: string | undefined;
  do {
    const batch = await auth.listUsers(1000, pageToken);
    total += batch.users.length;
    pageToken = batch.pageToken;
  } while (pageToken);
  return total;
}

async function countActiveProfiles(days: number): Promise<number> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const snap = await getFirestore()
    .collection("userProfiles")
    .where("lastSeenAt", ">=", since)
    .count()
    .get();
  return snap.data().count;
}

export const adminVerify = onCall(adminCallOptions, async (request) => {
    bindAdminEmailsEnv();
    const { email, uid } = await assertAdmin(request);
    return { isAdmin: true, email, uid };
  },
);

export const adminGetDashboard = onCall(adminCallOptions, async (request) => {
    bindAdminEmailsEnv();
    await assertAdmin(request);
    const db = getFirestore();
    const [totalUsers, activeLast7d, usageToday, openFlags, openSupport] =
      await Promise.all([
        countAllUsers(),
        countActiveProfiles(7),
        aggregateTodayUsage(),
        db
          .collection("flags")
          .where("status", "==", "open")
          .count()
          .get()
          .then((s) => s.data().count),
        db
          .collection("supportTickets")
          .where("status", "==", "open")
          .count()
          .get()
          .then((s) => s.data().count)
          .catch(() => 0),
      ]);

    const day = new Date().toISOString().slice(0, 10);
    const topSnap = await db
      .collection(`usageDaily/${day}/users`)
      .orderBy("cloudSttChunks", "desc")
      .limit(10)
      .get();

    const topCloudUsers = await Promise.all(
      topSnap.docs.map(async (doc) => {
        const data = doc.data();
        const uid = doc.id;
        const profile = await db.doc(`userProfiles/${uid}`).get();
        const p = profile.data();
        return {
          uid,
          email: (p?.email as string | undefined) ?? null,
          plan: (p?.plan as string | undefined) ?? "free",
          cloudSttChunks: (data.cloudSttChunks as number) ?? 0,
          aiCalls: (data.aiCalls as number) ?? 0,
        };
      }),
    );

    return {
      users: { total: totalUsers, activeLast7d },
      usage: {
        today: {
          aiCalls: usageToday.aiCalls,
          cloudSttChunks: usageToday.cloudSttChunks,
          meetings: usageToday.meetings,
          activeUsers: usageToday.activeUsers,
        },
        topCloudUsers,
      },
      billing: {
        stripeConfigured: stripeConfigured(),
        mrr: null as number | null,
        activeSubscriptions: null as number | null,
        message: stripeConfigured()
          ? "Stripe secret present — wire webhooks for live MRR."
          : "Set STRIPE_SECRET_KEY on Functions to enable billing metrics.",
      },
      flags: { open: openFlags },
      support: { open: openSupport },
    };
  },
);

const listUsersSchema = z.object({
  // Callable JSON may send null for omitted optional fields.
  pageToken: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  limit: z.number().int().min(1).max(100).default(50),
});

export const adminListUsers = onCall(adminCallOptions, async (request) => {
    bindAdminEmailsEnv();
    await assertAdmin(request);
    const parsed = listUsersSchema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }
    const { pageToken, limit } = parsed.data;
    const batch = await getAuth().listUsers(limit, pageToken);
    const db = getFirestore();
    const day = new Date().toISOString().slice(0, 10);

    const users = await Promise.all(
      batch.users.map(async (u) => {
        const profile = await db.doc(`userProfiles/${u.uid}`).get();
        const p = profile.data() ?? {};
        const usage = await db.doc(`usageDaily/${day}/users/${u.uid}`).get();
        const usageData = usage.data() ?? {};
        return {
          uid: u.uid,
          email: u.email ?? (p.email as string | undefined) ?? null,
          disabled: u.disabled,
          createdAt: u.metadata.creationTime,
          lastLoginAt: u.metadata.lastSignInTime ?? null,
          role: (p.role as string | undefined) ?? "member",
          plan: (p.plan as string | undefined) ?? "free",
          suspended: Boolean(p.suspended) || u.disabled,
          platform: (p.platform as string | undefined) ?? null,
          usageToday: {
            aiCalls: (usageData.aiCalls as number) ?? 0,
            cloudSttChunks: (usageData.cloudSttChunks as number) ?? 0,
          },
        };
      }),
    );

    return {
      users,
      nextPageToken: batch.pageToken ?? null,
    };
  },
);

const updateUserSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(["admin", "member"]).optional(),
  plan: z.enum(["free", "pro", "business"]).optional(),
  suspended: z.boolean().optional(),
  trialEndsAt: z.number().nullable().optional(),
  adminNotes: z.string().max(4000).optional(),
});

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export const adminUpdateUser = onCall(adminCallOptions, async (request) => {
    bindAdminEmailsEnv();
    await assertAdmin(request);
    const parsed = updateUserSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }
    const { uid, role, plan, suspended, trialEndsAt } = parsed.data;
    const auth = getAuth();
    const db = getFirestore();

    try {
      await auth.getUser(uid);
    } catch {
      throw new HttpsError("not-found", "User not found.");
    }

    if (suspended !== undefined) {
      await auth.updateUser(uid, { disabled: suspended });
    }

    if (role !== undefined) {
      const user = await auth.getUser(uid);
      const claims: Record<string, unknown> = {
        ...(user.customClaims ?? {}),
        role,
      };
      if (role === "admin") {
        claims.admin = true;
      } else {
        delete claims.admin;
      }
      await auth.setCustomUserClaims(uid, claims);
    }

    const profilePatch: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (role !== undefined) profilePatch.role = role;
    if (plan !== undefined) profilePatch.plan = plan;
    if (suspended !== undefined) profilePatch.suspended = suspended;
    if (trialEndsAt !== undefined) profilePatch.trialEndsAt = trialEndsAt;
    if (parsed.data.adminNotes !== undefined) {
      profilePatch.adminNotes = parsed.data.adminNotes;
    }

    await db.doc(`userProfiles/${uid}`).set(profilePatch, { merge: true });

    return { ok: true, uid };
  },
);

export const adminListFlags = onCall(adminCallOptions, async (request) => {
    bindAdminEmailsEnv();
    await assertAdmin(request);
    const snap = await getFirestore()
      .collection("flags")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const flags = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { flags };
  },
);

export const adminGetUser = onCall(adminCallOptions, async (request) => {
  bindAdminEmailsEnv();
  await assertAdmin(request);
  const schema = z.object({ uid: z.string().min(1) });
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { uid } = parsed.data;
  const auth = getAuth();
  const db = getFirestore();
  let authUser;
  try {
    authUser = await auth.getUser(uid);
  } catch {
    throw new HttpsError("not-found", "User not found.");
  }
  const profile = (await db.doc(`userProfiles/${uid}`).get()).data() ?? {};
  const days = lastNDays(7);
  const usageByDay: Array<{
    day: string;
    aiCalls: number;
    cloudSttChunks: number;
    meetings: number;
  }> = [];
  for (const day of days) {
    const usage = await db.doc(`usageDaily/${day}/users/${uid}`).get();
    const d = usage.data() ?? {};
    usageByDay.push({
      day,
      aiCalls: (d.aiCalls as number) ?? 0,
      cloudSttChunks: (d.cloudSttChunks as number) ?? 0,
      meetings: (d.meetings as number) ?? 0,
    });
  }
  return {
    uid,
    email: authUser.email ?? (profile.email as string | undefined) ?? null,
    disabled: authUser.disabled,
    createdAt: authUser.metadata.creationTime,
    lastLoginAt: authUser.metadata.lastSignInTime ?? null,
    emailVerified: authUser.emailVerified,
    role: (profile.role as string | undefined) ?? "member",
    plan: (profile.plan as string | undefined) ?? "free",
    suspended: Boolean(profile.suspended) || authUser.disabled,
    platform: (profile.platform as string | undefined) ?? null,
    adminNotes: (profile.adminNotes as string | undefined) ?? "",
    trialEndsAt: (profile.trialEndsAt as number | undefined) ?? null,
    usageByDay,
  };
});

export const adminListSupportTickets = onCall(adminCallOptions, async (request) => {
  bindAdminEmailsEnv();
  await assertAdmin(request);
  const schema = z.object({
    status: z.enum(["open", "resolved", "all"]).default("open"),
    limit: z.number().int().min(1).max(100).default(50),
  });
  const parsed = schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { status, limit } = parsed.data;
  const db = getFirestore();
  // Single-field index on createdAt (no composite index required).
  const fetchLimit = status === "all" ? limit : Math.min(limit * 5, 100);
  const snap = await db
    .collection("supportTickets")
    .orderBy("createdAt", "desc")
    .limit(fetchLimit)
    .get();
  const docs =
    status === "all"
      ? snap.docs
      : snap.docs.filter((d) => d.data().status === status);
  const tickets = await Promise.all(
    docs.slice(0, limit).map(async (doc) => {
      const data = doc.data();
      const uid = data.uid as string;
      const profile = await db.doc(`userProfiles/${uid}`).get();
      return {
        id: doc.id,
        uid,
        email:
          (data.email as string | undefined) ??
          (profile.data()?.email as string | undefined) ??
          null,
        message: (data.message as string) ?? "",
        status: (data.status as string) ?? "open",
        adminReply: (data.adminReply as string | undefined) ?? null,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
      };
    }),
  );
  return { tickets };
});

export const adminUpdateSupportTicket = onCall(adminCallOptions, async (request) => {
  bindAdminEmailsEnv();
  await assertAdmin(request);
  const schema = z.object({
    ticketId: z.string().min(1),
    status: z.enum(["open", "resolved"]),
    adminReply: z.string().max(4000).optional(),
  });
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const ref = getFirestore().doc(`supportTickets/${parsed.data.ticketId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Ticket not found.");
  }
  const patch: Record<string, unknown> = {
    status: parsed.data.status,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (parsed.data.adminReply !== undefined) {
    patch.adminReply = parsed.data.adminReply;
  }
  await ref.update(patch);
  return { ok: true };
});

export const adminResolveFlag = onCall(adminCallOptions, async (request) => {
    bindAdminEmailsEnv();
    await assertAdmin(request);
    const schema = z.object({
      flagId: z.string().min(1),
      status: z.enum(["open", "resolved", "dismissed"]),
    });
    const parsed = schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }
    const ref = getFirestore().doc(`flags/${parsed.data.flagId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Flag not found.");
    }
    await ref.update({
      status: parsed.data.status,
      resolvedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  },
);
