import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getAdminConfig } from "./config";

export function getCallableClientIp(
  request: CallableRequest<unknown>,
): string | null {
  const raw = request.rawRequest;
  if (!raw) return null;
  const forwarded = raw.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  if (typeof raw.ip === "string" && raw.ip.length > 0) {
    return raw.ip;
  }
  return null;
}

export async function assertAdminIpAllowed(
  request: CallableRequest<unknown>,
): Promise<void> {
  const envList = (process.env.ADMIN_IP_ALLOWLIST ?? "")
    .split(/[,;\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
  const config = await getAdminConfig();
  const fsList = config.adminIpAllowlist ?? [];
  const allowed = new Set([...envList, ...fsList]);
  if (allowed.size === 0) return;

  const ip = getCallableClientIp(request);
  if (!ip || !allowed.has(ip)) {
    throw new HttpsError(
      "permission-denied",
      "Admin access is restricted to approved IP addresses.",
    );
  }
}
