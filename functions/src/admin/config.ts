import { getFirestore } from "firebase-admin/firestore";

const CONFIG_PATH = "adminConfig/config";

export type AdminConfigDoc = {
  adminEmails?: string[];
  /** Optional comma-separated IPs stored in Firestore (merged with ADMIN_IP_ALLOWLIST env). */
  adminIpAllowlist?: string[];
};

/** Comma-separated emails from secret/env (e.g. you@company.com,ops@company.com). */
function parseEmailList(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase().replace(/^["']|["']$/g, ""))
    .filter((e) => e.includes("@"));
}

export function getAdminEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return parseEmailList(raw);
}

export async function getAdminConfig(): Promise<AdminConfigDoc> {
  try {
    const snap = await getFirestore().doc(CONFIG_PATH).get();
    return (snap.data() as AdminConfigDoc | undefined) ?? {};
  } catch {
    return {};
  }
}

export async function getAdminEmails(): Promise<string[]> {
  const fromEnv = getAdminEmailsFromEnv();
  try {
    const data = await getAdminConfig();
    const fromFirestore =
      data.adminEmails
        ?.map((e) => e.trim().toLowerCase())
        .filter(Boolean) ?? [];
    const merged = new Set([...fromEnv, ...fromFirestore]);
    return [...merged];
  } catch {
    return fromEnv;
  }
}

export async function setAdminConfig(patch: AdminConfigDoc): Promise<void> {
  await getFirestore()
    .doc(CONFIG_PATH)
    .set(
      {
        ...patch,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
}
