"use client";

import { TeamsBotJoinPanel } from "@/components/integrations/teams-bot-join-panel";
import { useMicrosoftIntegration } from "@/hooks/use-microsoft-integration";
import { usePlanAndUsage } from "@/hooks/use-plan-and-usage";
import { TEAMS_BOT_INTEGRATION_LAUNCHED } from "@/lib/integrations/microsoft/feature";
import { usagePercent } from "@/lib/plan/limits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/branding/app-name";
import { isFirebaseConfigured } from "@/lib/env/client";
import { Bot, Clock, Loader2, PlugZap } from "lucide-react";
import Link from "next/link";

function QuotaLine({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const pct = usagePercent(used, limit);
  const over = limit != null && used >= limit;
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between gap-2">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={
            over ? "font-medium text-amber-700 dark:text-amber-300" : "tabular-nums"
          }
        >
          {used}
          {limit != null ? ` / ${limit}` : ""}
        </span>
      </div>
      {limit != null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full ${
              over ? "bg-amber-500" : "bg-violet-600"
            }`}
            style={{ width: `${Math.min(100, pct ?? 0)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function TeamsBotComingSoon() {
  return (
    <Card id="teams-bot">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          Microsoft Teams bot
          <Badge variant="secondary" className="text-[10px] font-normal">
            Coming soon
          </Badge>
        </CardTitle>
        <CardDescription>
          A disclosed bot will join Teams meetings for full-call, multi-speaker
          transcription (Otter-style). Planned for Pro and Power.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-3 text-sm dark:border-zinc-600 dark:bg-zinc-900/40">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Everything else in {APP_NAME} works today — mic recording, cloud STT,
              meetings, notes, and groups. No Microsoft setup required.
            </p>
            <p>
              For Teams / Zoom / Meet right now, use{" "}
              <Link
                href="/help/teams-zoom-meet/"
                className="font-medium text-violet-600 underline dark:text-violet-400"
              >
                the video-call capture guide
              </Link>{" "}
              (headphones + meeting mode cloud STT).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamsBotIntegrationLive() {
  const { plan } = usePlanAndUsage();
  const {
    status,
    loading,
    error,
    busy,
    connect,
    disconnect,
    refresh,
    sendBotToMeeting,
  } = useMicrosoftIntegration();

  const quota = status?.quota;
  const integration = status?.integration;
  const botEnabled = quota?.enabled ?? false;
  const planLabel = status?.planRequired === "power" ? "Power" : "Pro";

  return (
    <Card id="teams-bot">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          Microsoft Teams bot
        </CardTitle>
        <CardDescription>
          Otter-style path: a disclosed bot joins your Teams meeting and streams
          audio for multi-speaker transcription. Pro and Power include different
          monthly bot minutes and joins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!botEnabled ? (
          <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/40 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/20">
            <p className="font-medium text-violet-900 dark:text-violet-100">
              {plan === "power" || plan === "pro"
                ? "Teams bot requires an active subscription."
                : `Teams bot is included on ${planLabel} and Power.`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mic-only capture cannot match Otter for mixed accents in large calls.
              The bot joins as a participant (you should announce it to attendees).
            </p>
            <Link
              href="/settings/#billing"
              className="mt-2 inline-block text-xs font-medium text-violet-600 underline dark:text-violet-400"
            >
              View plans
            </Link>
          </div>
        ) : (
          <>
            {integration?.connected ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">
                    {integration.displayName ?? integration.email ?? "Connected"}
                  </p>
                  {integration.email ? (
                    <p className="text-xs text-muted-foreground">{integration.email}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void disconnect()}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={busy || loading}
                onClick={() => void connect()}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <PlugZap className="mr-1.5 h-4 w-4" />
                )}
                Connect Microsoft account
              </Button>
            )}

            {!integration?.workerReady ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                Bot worker is not live in this environment yet. You can connect
                Microsoft and queue joins; they will run when the Azure worker is
                deployed.
              </p>
            ) : null}

            {quota ? (
              <div className="space-y-2">
                <QuotaLine
                  label="Bot minutes this month"
                  used={quota.minutesUsed}
                  limit={quota.minutesLimit}
                />
                <QuotaLine
                  label="Bot joins this month"
                  used={quota.joinsUsed}
                  limit={quota.joinsLimit}
                />
                {quota.calendarAutoJoin ? (
                  <Badge variant="secondary" className="text-[10px]">
                    Calendar auto-join (Power beta)
                  </Badge>
                ) : null}
              </div>
            ) : null}

            {integration?.connected ? (
              <TeamsBotJoinPanel
                disabled={busy}
                showTitle={false}
                quotaEnabled={quota?.enabled}
                connected={integration.connected}
                busy={busy}
                sendBotToMeeting={sendBotToMeeting}
              />
            ) : null}
          </>
        )}

        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {error ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {error}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void refresh()}
            >
              Retry
            </button>
          </p>
        ) : null}

        <p className="text-[11px] text-muted-foreground">
          <Link href="/help/teams-zoom-meet/" className="underline">
            Mic capture guide
          </Link>{" "}
          remains the fallback on Free.
        </p>
      </CardContent>
    </Card>
  );
}

export function MicrosoftTeamsIntegration() {
  if (!isFirebaseConfigured()) return null;
  if (!TEAMS_BOT_INTEGRATION_LAUNCHED) {
    return <TeamsBotComingSoon />;
  }
  return <TeamsBotIntegrationLive />;
}
