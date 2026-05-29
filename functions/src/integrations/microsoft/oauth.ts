import * as logger from "firebase-functions/logger";
import {
  MICROSOFT_OAUTH_SCOPES,
  requireMicrosoftClientId,
  requireMicrosoftClientSecret,
  tenantAuthority,
} from "./config";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

function tokenUrl(): string {
  return `https://login.microsoftonline.com/${tenantAuthority()}/oauth2/v2.0/token`;
}

function authorizeUrl(): string {
  return `https://login.microsoftonline.com/${tenantAuthority()}/oauth2/v2.0/authorize`;
}

export function buildMicrosoftAuthorizeUrl(
  redirectUri: string,
  state: string,
): string {
  const clientId = requireMicrosoftClientId();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: MICROSOFT_OAUTH_SCOPES.join(" "),
    state,
    prompt: "consent",
  });
  return `${authorizeUrl()}?${params.toString()}`;
}

export async function exchangeMicrosoftCode(
  code: string,
  redirectUri: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  displayName?: string;
  email?: string;
  microsoftUserId?: string;
  tenantId?: string;
}> {
  const body = new URLSearchParams({
    client_id: requireMicrosoftClientId(),
    client_secret: requireMicrosoftClientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    scope: MICROSOFT_OAUTH_SCOPES.join(" "),
  });

  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as TokenResponse & { error?: string };
  if (!res.ok) {
    logger.warn("microsoft.oauth.exchange_failed", { status: res.status, json });
    throw new Error(json.error ?? `Microsoft token exchange failed (${res.status})`);
  }
  if (!json.refresh_token) {
    throw new Error("Microsoft did not return a refresh token. Try disconnecting and reconnecting.");
  }

  const profile = await fetchMicrosoftProfile(json.access_token);
  const expiresAt = Date.now() + (json.expires_in ?? 3600) * 1000;

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt,
    scopes: (json.scope ?? MICROSOFT_OAUTH_SCOPES.join(" ")).split(" "),
    displayName: profile.displayName,
    email: profile.email,
    microsoftUserId: profile.microsoftUserId,
    tenantId: profile.tenantId,
  };
}

async function fetchMicrosoftProfile(accessToken: string): Promise<{
  displayName?: string;
  email?: string;
  microsoftUserId?: string;
  tenantId?: string;
}> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    return {};
  }
  const me = (await res.json()) as {
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
    id?: string;
  };
  return {
    displayName: me.displayName,
    email: me.mail ?? me.userPrincipalName,
    microsoftUserId: me.id,
  };
}

export async function refreshMicrosoftAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const body = new URLSearchParams({
    client_id: requireMicrosoftClientId(),
    client_secret: requireMicrosoftClientSecret(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: MICROSOFT_OAUTH_SCOPES.join(" "),
  });

  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as TokenResponse & { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "Microsoft token refresh failed");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}
