"use client";

import {
  FAIR_USE_TOOLTIP,
  formatAiLimitLabel,
  formatCloudSttLimitLabel,
  usagePercent,
} from "@/lib/plan/limits";
import { TEAMS_BOT_INTEGRATION_LAUNCHED } from "@/lib/integrations/microsoft/feature";
import type { PlanAndUsageResponse } from "@/lib/plan/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Loader2 } from "lucide-react";

function UsageBar({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number | null;
  unit: string;
}) {
  const pct = usagePercent(used, limit);
  const over = limit != null && used >= limit;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={
            over ? "font-medium text-amber-700 dark:text-amber-300" : "tabular-nums"
          }
        >
          {used.toFixed(limit != null && unit === " min" ? 0 : 0)}
          {unit}
          {limit != null ? ` / ${limit}${unit}` : " · fair use"}
        </span>
      </div>
      {limit != null ? (
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${
              over
                ? "bg-amber-500"
                : pct != null && pct >= 80
                  ? "bg-amber-400"
                  : "bg-violet-600"
            }`}
            style={{ width: `${Math.min(100, pct ?? 0)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  data: PlanAndUsageResponse | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function PlanUsageCard({ data, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-2 py-4 text-sm">
          <p className="text-amber-700 dark:text-amber-300">{error}</p>
          {onRetry ? (
            <button
              type="button"
              className="text-xs font-medium text-violet-600 underline dark:text-violet-400"
              onClick={() => void onRetry()}
            >
              Retry
            </button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { plan, config, usage, limits, display } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Plan & usage
        </CardTitle>
        <CardDescription>
          {display.name} · {display.tagline} · resets UTC monthly (
          {usage.month})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <UsageBar
          label={`Cloud transcription (${formatCloudSttLimitLabel(plan, config)})`}
          used={usage.cloudSttMinutes}
          limit={limits.cloudSttMinutesPerMonth}
          unit=" min"
        />
        <UsageBar
          label={`AI actions (${formatAiLimitLabel(plan, config)})`}
          used={usage.aiCalls}
          limit={limits.aiCallsPerMonth}
          unit=""
        />
        {limits.cloudSttChunksPerDay != null ? (
          <UsageBar
            label="Cloud segments today"
            used={usage.cloudSttChunksToday}
            limit={limits.cloudSttChunksPerDay}
            unit=""
          />
        ) : null}
        {TEAMS_BOT_INTEGRATION_LAUNCHED && limits.teamsBotEnabled ? (
          <>
            <UsageBar
              label="Teams bot minutes"
              used={usage.teamsBotMinutes}
              limit={limits.teamsBotMinutesPerMonth}
              unit=" min"
            />
            <UsageBar
              label="Teams bot joins"
              used={usage.teamsBotJoins}
              limit={limits.teamsBotJoinsPerMonth}
              unit=""
            />
          </>
        ) : null}
        {limits.aiFairUse ? (
          <p className="text-xs text-muted-foreground" title={FAIR_USE_TOOLTIP}>
            {config.fairUseTooltip}
          </p>
        ) : null}
        {plan === "free" ? (
          <p className="text-xs text-muted-foreground">
            On-device transcription is unlimited. Limits apply to cloud
            transcription and AI only.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
