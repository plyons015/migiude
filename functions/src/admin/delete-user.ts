import { getAuth } from "firebase-admin/auth";
import { getFirestore, type DocumentReference } from "firebase-admin/firestore";
import { countUserData } from "./audit";

export type DeletionManifest = {
  uid: string;
  email: string | null;
  dataCounts: Record<string, number>;
  deletedCollections: string[];
};

async function deleteQueryBatch(refs: DocumentReference[]): Promise<number> {
  const db = getFirestore();
  let deleted = 0;
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    const slice = refs.slice(i, i + 400);
    for (const ref of slice) {
      batch.delete(ref);
    }
    await batch.commit();
    deleted += slice.length;
  }
  return deleted;
}

export async function purgeUserData(uid: string): Promise<DeletionManifest> {
  const db = getFirestore();
  const auth = getAuth();
  const authUser = await auth.getUser(uid).catch(() => null);
  const profile = (await db.doc(`userProfiles/${uid}`).get()).data();
  const dataCounts = await countUserData(uid);
  const deletedCollections: string[] = [];

  for (const sub of ["notes", "todos", "meetings", "meetingAppends"] as const) {
    const snap = await db.collection(`users/${uid}/${sub}`).get();
    if (snap.empty) continue;
    await deleteQueryBatch(snap.docs.map((d) => d.ref));
    deletedCollections.push(`users/${uid}/${sub}`);
  }

  const tickets = await db
    .collection("supportTickets")
    .where("uid", "==", uid)
    .get();
  if (!tickets.empty) {
    await deleteQueryBatch(tickets.docs.map((d) => d.ref));
    deletedCollections.push("supportTickets");
  }

  const flags = await db.collection("flags").where("uid", "==", uid).get();
  if (!flags.empty) {
    await deleteQueryBatch(flags.docs.map((d) => d.ref));
    deletedCollections.push("flags");
  }

  const orgId = profile?.orgId as string | undefined;
  if (orgId) {
    await db.doc(`orgs/${orgId}/members/${uid}`).delete().catch(() => undefined);
    deletedCollections.push(`orgs/${orgId}/members`);
  }

  await db.doc(`userProfiles/${uid}`).delete().catch(() => undefined);
  deletedCollections.push("userProfiles");

  if (authUser) {
    await auth.deleteUser(uid);
    deletedCollections.push("auth");
  }

  return {
    uid,
    email: authUser?.email ?? (profile?.email as string | undefined) ?? null,
    dataCounts,
    deletedCollections,
  };
}
