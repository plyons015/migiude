"use client";

import {
  cloudSttUsageToMinutes,
  formatAiLimitLabel,
  formatCloudSttLimitLabel,
  normalizePlanId,
  planLimitsFor,
  usagePercent,
  type LaunchPlanConfig,
} from "@/lib/admin/plan-limits";
import { DEFAULT_LAUNCH_PLAN_CONFIG } from "@/lib/plan/config-schema";

type Props = {
  plan: string;
  aiCalls: number;
  cloudSttChunks: number;
  cloudSttChunksToday?: number;
  config?: LaunchPlanConfig;
  compact?: boolean;
};

function QuotaBar({
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
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={over ? "font-medium text-amber-700 dark:text-amber-300" : ""}>
          {used}
          {unit}{" "}
          {limit != null ? `/ ${limit}${unit}` : "· fair use (no hard cap)"}
        </span>
      </div>
      {limit != null ? (
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${
              over ? "bg-amber-500" : pct != null && pct >= 80 ? "bg-amber-400" : "bg-violet-600"
            }`}
            style={{ width: `${Math.min(100, pct ?? 0)}%` }}
          />
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">Fair use — no hard monthly cap.</p>
      )}
    </div>
  );
}

export function AdminUsageQuota({
  plan,
  aiCalls,
  cloudSttChunks,
  cloudSttChunksToday,
  config = DEFAULT_LAUNCH_PLAN_CONFIG,
  compact,
}: Props) {
  const normalized = normalizePlanId(plan);
  const limits = planLimitsFor(plan, config);
  const cloudMinutes = cloudSttUsageToMinutes({ cloudSttChunks });

  return (
    <div
      className={
        compact
          ? "space-y-2"
          : "space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
      }
    >
      {!compact ? (
        <p className="text-xs font-medium text-muted-foreground">
          Usage (UTC) · {normalized} plan · live config
        </p>
      ) : null}
      <QuotaBar
        label={`AI (${formatAiLimitLabel(plan, config)})`}
        used={aiCalls}
        limit={limits.aiCallsPerMonth}
        unit=""
      />
      <QuotaBar
        label={`Cloud transcription (${formatCloudSttLimitLabel(plan, config)})`}
        used={cloudMinutes}
        limit={limits.cloudSttMinutesPerMonth}
        unit=" min"
      />
      {limits.cloudSttChunksPerDay != null ? (
        <QuotaBar
          label="Cloud segments (today)"
          used={cloudSttChunksToday ?? 0}
          limit={limits.cloudSttChunksPerDay}
          unit=""
        />
      ) : null}
    </div>
  );
}
