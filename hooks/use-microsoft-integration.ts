"use client";

import {
  beginMicrosoftOAuth,
  disconnectMicrosoftIntegration,
  getMicrosoftIntegrationStatus,
  requestTeamsBotJoin,
} from "@/lib/integrations/microsoft/client";
import { microsoftOAuthRedirectUri } from "@/lib/integrations/microsoft/redirect";
import type { MicrosoftIntegrationStatus } from "@/lib/integrations/microsoft/types";
import { useAuthUser } from "@/hooks/use-auth-user";
import { TEAMS_BOT_INTEGRATION_LAUNCHED } from "@/lib/integrations/microsoft/feature";
import { useCallback, useEffect, useState } from "react";

const OAUTH_STATE_KEY = "migiude.microsoft.oauthState";

export function useMicrosoftIntegration() {
  const { user } = useAuthUser();
  const [status, setStatus] = useState<MicrosoftIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!TEAMS_BOT_INTEGRATION_LAUNCHED || !user) {
      setStatus(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await getMicrosoftIntegrationStatus();
      setStatus(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Microsoft integration.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    if (!TEAMS_BOT_INTEGRATION_LAUNCHED) return;
    setBusy(true);
    setError(null);
    try {
      const redirectUri = microsoftOAuthRedirectUri();
      const { url, state } = await beginMicrosoftOAuth(redirectUri);
      sessionStorage.setItem(OAUTH_STATE_KEY, state);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Microsoft sign-in.");
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await disconnectMicrosoftIntegration();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disconnect.");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const sendBotToMeeting = useCallback(
    async (input: {
      meetingUrl: string;
      meetingTitle?: string;
      migiudeMeetingId?: string;
      estimatedMinutes?: number;
    }) => {
      if (!TEAMS_BOT_INTEGRATION_LAUNCHED) {
        throw new Error("Teams bot integration is not available yet.");
      }
      setBusy(true);
      setError(null);
      try {
        const { job } = await requestTeamsBotJoin(input);
        await refresh();
        return job;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not queue Teams bot join.";
        setError(message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    status,
    loading,
    error,
    busy,
    refresh,
    connect,
    disconnect,
    sendBotToMeeting,
  };
}

export function consumeStoredMicrosoftOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  const state = sessionStorage.getItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  return state;
}
