import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function lastNDaysUtc(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export type RetentionDay = {
  day: string;
  signups: number;
  activeUsers: number;
};

export async function buildRetentionSeries(days = 28): Promise<RetentionDay[]> {
  const db = getFirestore();
  const dayKeys = lastNDaysUtc(days);
  const signupsByDay = new Map<string, number>();
  for (const day of dayKeys) signupsByDay.set(day, 0);

  const auth = getAuth();
  let pageToken: string | undefined;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  do {
    const batch = await auth.listUsers(1000, pageToken);
    for (const user of batch.users) {
      const created = Date.parse(user.metadata.creationTime);
      if (!Number.isFinite(created) || created < cutoff) continue;
      const day = new Date(created).toISOString().slice(0, 10);
      if (signupsByDay.has(day)) {
        signupsByDay.set(day, (signupsByDay.get(day) ?? 0) + 1);
      }
    }
    pageToken = batch.pageToken;
  } while (pageToken);

  const activeByDay = await Promise.all(
    dayKeys.map(async (day) => {
      const snap = await db.collection(`usageDaily/${day}/users`).count().get();
      return snap.data().count;
    }),
  );

  return dayKeys.map((day, i) => ({
    day,
    signups: signupsByDay.get(day) ?? 0,
    activeUsers: activeByDay[i] ?? 0,
  }));
}
