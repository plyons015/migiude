import { FunctionsError, httpsCallable } from "firebase/functions";
import type {
  AdminAuditEntry,
  AdminClientError,
  AdminConfigResponse,
  AdminDashboard,
  AdminFlag,
  AdminOrg,
  RetentionPoint,
  AdminSupportTicket,
  AdminUserDetail,
  AdminUserRow,
} from "@/lib/admin/types";
import { getFirebaseFunctions } from "@/lib/firebase/client";
import { formatCloudFunctionsNetworkError } from "@/lib/firebase/functions-network-error";
import { isFirebaseConfigured } from "@/lib/env/client";

function requireFunctions() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error("Firebase Functions is not initialized.");
  }
  return functions;
}

function parseError(error: unknown): string {
  const network = formatCloudFunctionsNetworkError(error);
  if (network) return network;
  if (error instanceof FunctionsError) {
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed.";
}

export async function adminVerify(): Promise<{
  isAdmin: boolean;
  email: string;
  uid: string;
}> {
  const fn = httpsCallable<void, { isAdmin: boolean; email: string; uid: string }>(
    requireFunctions(),
    "adminVerify",
  );
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminGetDashboard(): Promise<AdminDashboard> {
  const fn = httpsCallable<void, AdminDashboard>(
    requireFunctions(),
    "adminGetDashboard",
  );
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminListUsers(options?: {
  pageToken?: string;
  limit?: number;
}): Promise<{ users: AdminUserRow[]; nextPageToken: string | null }> {
  const fn = httpsCallable<
    { pageToken?: string; limit?: number },
    { users: AdminUserRow[]; nextPageToken: string | null }
  >(requireFunctions(), "adminListUsers");
  try {
    const payload: { limit: number; pageToken?: string } = {
      limit: options?.limit ?? 50,
    };
    if (options?.pageToken) {
      payload.pageToken = options.pageToken;
    }
    const { data } = await fn(payload);
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminUpdateUser(input: {
  uid: string;
  role?: "admin" | "member";
  plan?: "free" | "pro" | "power";
  suspended?: boolean;
  trialEndsAt?: number | null;
  adminNotes?: string;
}): Promise<void> {
  const fn = httpsCallable<typeof input, { ok: boolean }>(
    requireFunctions(),
    "adminUpdateUser",
  );
  try {
    await fn(input);
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminListFlags(): Promise<{ flags: AdminFlag[] }> {
  const fn = httpsCallable<void, { flags: AdminFlag[] }>(
    requireFunctions(),
    "adminListFlags",
  );
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminResolveFlag(
  flagId: string,
  status: "open" | "resolved" | "dismissed",
): Promise<void> {
  const fn = httpsCallable<
    { flagId: string; status: string },
    { ok: boolean }
  >(requireFunctions(), "adminResolveFlag");
  try {
    await fn({ flagId, status });
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminGetUser(uid: string): Promise<AdminUserDetail> {
  const fn = httpsCallable<{ uid: string }, AdminUserDetail>(
    requireFunctions(),
    "adminGetUser",
  );
  try {
    const { data } = await fn({ uid });
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminListSupportTickets(options?: {
  status?: "open" | "resolved" | "all";
  limit?: number;
}): Promise<{ tickets: AdminSupportTicket[] }> {
  const fn = httpsCallable<
    { status?: string; limit?: number },
    { tickets: AdminSupportTicket[] }
  >(requireFunctions(), "adminListSupportTickets");
  try {
    const { data } = await fn(options ?? {});
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminUpdateSupportTicket(input: {
  ticketId: string;
  status: "open" | "resolved";
  adminReply?: string;
}): Promise<void> {
  const fn = httpsCallable<
    { ticketId: string; status: string; adminReply?: string },
    { ok: boolean }
  >(requireFunctions(), "adminUpdateSupportTicket");
  const payload: { ticketId: string; status: string; adminReply?: string } = {
    ticketId: input.ticketId,
    status: input.status,
  };
  const reply = input.adminReply?.trim();
  if (reply) {
    payload.adminReply = reply;
  }
  try {
    await fn(payload);
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminListAuditLog(
  limit = 50,
): Promise<{ entries: AdminAuditEntry[] }> {
  const fn = httpsCallable<{ limit: number }, { entries: AdminAuditEntry[] }>(
    requireFunctions(),
    "adminListAuditLog",
  );
  try {
    const { data } = await fn({ limit });
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminDeleteUser(input: {
  uid: string;
  confirmEmail: string;
  reasonCode:
    | "abuse"
    | "billing_dispute"
    | "duplicate_account"
    | "gdpr_erasure"
    | "retention_policy"
    | "security_incident"
    | "support_request"
    | "policy_violation"
    | "other";
  reasonText: string;
}): Promise<{ ok: boolean; manifest: unknown }> {
  const fn = httpsCallable<typeof input, { ok: boolean; manifest: unknown }>(
    requireFunctions(),
    "adminDeleteUser",
  );
  try {
    const { data } = await fn(input);
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminGetRetention(days = 28): Promise<{ series: RetentionPoint[] }> {
  const fn = httpsCallable<{ days: number }, { series: RetentionPoint[] }>(
    requireFunctions(),
    "adminGetRetention",
  );
  try {
    const { data } = await fn({ days });
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminGetAdminConfig(): Promise<AdminConfigResponse> {
  const fn = httpsCallable<void, AdminConfigResponse>(
    requireFunctions(),
    "adminGetAdminConfig",
  );
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminUpdateAdminConfig(input: {
  adminEmails?: string[];
  adminIpAllowlist?: string[];
}): Promise<void> {
  const fn = httpsCallable<typeof input, { ok: boolean }>(
    requireFunctions(),
    "adminUpdateAdminConfig",
  );
  try {
    await fn(input);
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminListOrgs(): Promise<{ orgs: AdminOrg[] }> {
  const fn = httpsCallable<void, { orgs: AdminOrg[] }>(
    requireFunctions(),
    "adminListOrgs",
  );
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminCreateOrg(input: {
  name: string;
  seatLimit: number;
  plan?: "power";
}): Promise<{ ok: boolean; orgId: string }> {
  const fn = httpsCallable<
    { name: string; seatLimit: number; plan?: "power" },
    { ok: boolean; orgId: string }
  >(requireFunctions(), "adminCreateOrg");
  try {
    const { data } = await fn(input);
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminUpdateOrg(input: {
  orgId: string;
  name?: string;
  seatLimit?: number;
}): Promise<void> {
  const fn = httpsCallable<typeof input, { ok: boolean }>(
    requireFunctions(),
    "adminUpdateOrg",
  );
  try {
    await fn(input);
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminAddOrgMember(input: {
  orgId: string;
  uid: string;
  role?: "owner" | "member";
}): Promise<void> {
  const fn = httpsCallable<typeof input, { ok: boolean }>(
    requireFunctions(),
    "adminAddOrgMember",
  );
  try {
    await fn(input);
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminRemoveOrgMember(input: {
  orgId: string;
  uid: string;
}): Promise<void> {
  const fn = httpsCallable<typeof input, { ok: boolean }>(
    requireFunctions(),
    "adminRemoveOrgMember",
  );
  try {
    await fn(input);
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminListClientErrors(
  limit = 50,
): Promise<{ errors: AdminClientError[] }> {
  const fn = httpsCallable<{ limit: number }, { errors: AdminClientError[] }>(
    requireFunctions(),
    "adminListClientErrors",
  );
  try {
    const { data } = await fn({ limit });
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}
