/**
 * Microsoft / Teams bot credentials.
 *
 * Deploy works without MICROSOFT_* secrets. When ready to launch:
 * 1. Uncomment defineSecret + microsoftSecretsForDeploy below
 * 2. firebase functions:secrets:set MICROSOFT_CLIENT_ID (etc.)
 * 3. Add `secrets: [...microsoftSecretsForDeploy]` to callOptions in handlers.ts
 */

// import { defineSecret } from "firebase-functions/params";
// export const microsoftClientId = defineSecret("MICROSOFT_CLIENT_ID");
// export const microsoftClientSecret = defineSecret("MICROSOFT_CLIENT_SECRET");
// export const microsoftTenantId = defineSecret("MICROSOFT_TENANT_ID");
// export const teamsBotWorkerBaseUrl = defineSecret("TEAMS_BOT_WORKER_BASE_URL");
// export const microsoftSecretsForDeploy = [
//   microsoftClientId,
//   microsoftClientSecret,
//   microsoftTenantId,
//   teamsBotWorkerBaseUrl,
// ] as const;

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

/** Delegated scopes for user connect + meeting join orchestration. */
export const MICROSOFT_OAUTH_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "OnlineMeetings.Read",
  "Calendars.Read",
] as const;

export function getMicrosoftClientId(): string | undefined {
  return env("MICROSOFT_CLIENT_ID");
}

export function getMicrosoftClientSecret(): string | undefined {
  return env("MICROSOFT_CLIENT_SECRET");
}

export function getMicrosoftTenantId(): string | undefined {
  return env("MICROSOFT_TENANT_ID");
}

export function getTeamsBotWorkerBaseUrl(): string | undefined {
  return env("TEAMS_BOT_WORKER_BASE_URL");
}

export function microsoftOAuthConfigured(): boolean {
  return Boolean(getMicrosoftClientId() && getMicrosoftClientSecret());
}

export function teamsBotWorkerConfigured(): boolean {
  return Boolean(getTeamsBotWorkerBaseUrl());
}

export function tenantAuthority(): string {
  return getMicrosoftTenantId() || "common";
}

export function requireMicrosoftClientId(): string {
  const id = getMicrosoftClientId();
  if (!id) {
    throw new Error("MICROSOFT_CLIENT_ID is not configured.");
  }
  return id;
}

export function requireMicrosoftClientSecret(): string {
  const secret = getMicrosoftClientSecret();
  if (!secret) {
    throw new Error("MICROSOFT_CLIENT_SECRET is not configured.");
  }
  return secret;
}

export function requireTeamsBotWorkerBaseUrl(): string {
  const base = getTeamsBotWorkerBaseUrl();
  if (!base) {
    throw new Error("TEAMS_BOT_WORKER_BASE_URL is not configured.");
  }
  return base;
}
