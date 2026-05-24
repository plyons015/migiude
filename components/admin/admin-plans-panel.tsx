"use client";

import {
  adminGetPlanConfig,
  adminResetPlanConfig,
  adminUpdatePlanConfig,
} from "@/lib/plan/client";
import {
  DEFAULT_LAUNCH_PLAN_CONFIG,
  type LaunchPlanConfig,
  type PlanId,
} from "@/lib/plan/config-schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const TIER_IDS: PlanId[] = ["free", "pro", "power"];

function numOrNull(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t.toLowerCase() === "null") return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function TierEditor({
  id,
  tier,
  onChange,
}: {
  id: PlanId;
  tier: LaunchPlanConfig["tiers"][PlanId];
  onChange: (next: LaunchPlanConfig["tiers"][PlanId]) => void;
}) {
  const setLimit = (
    key: keyof LaunchPlanConfig["tiers"][PlanId]["limits"],
    value: string | boolean,
  ) => {
    if (typeof value === "boolean") {
      onChange({
        ...tier,
        limits: { ...tier.limits, [key]: value },
      });
      return;
    }
    const numericKeys = [
      "aiCallsPerMonth",
      "cloudSttMinutesPerMonth",
      "cloudSttChunksPerDay",
      "cloudSttChunksPerDayWarn",
    ] as const;
    if (numericKeys.includes(key as (typeof numericKeys)[number])) {
      onChange({
        ...tier,
        limits: {
          ...tier.limits,
          [key]: numOrNull(String(value)),
        },
      });
    }
  };

  const setDisplay = (
    key: keyof LaunchPlanConfig["tiers"][PlanId]["display"],
    value: string,
  ) => {
    if (key === "bullets") return;
    onChange({
      ...tier,
      display: {
        ...tier.display,
        [key]:
          key === "priceMonthlyUsd" || key === "priceYearlyUsd"
            ? numOrNull(value)
            : value,
      },
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <p className="text-sm font-semibold capitalize">{id}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">
          <span className="text-muted-foreground">AI / month (empty = fair use)</span>
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.limits.aiCallsPerMonth ?? ""}
            onChange={(e) => setLimit("aiCallsPerMonth", e.target.value)}
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Cloud min / month</span>
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.limits.cloudSttMinutesPerMonth ?? ""}
            onChange={(e) => setLimit("cloudSttMinutesPerMonth", e.target.value)}
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Cloud segments / day</span>
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.limits.cloudSttChunksPerDay ?? ""}
            onChange={(e) => setLimit("cloudSttChunksPerDay", e.target.value)}
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Warn segments / day</span>
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.limits.cloudSttChunksPerDayWarn ?? ""}
            onChange={(e) => setLimit("cloudSttChunksPerDayWarn", e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <input
            type="checkbox"
            checked={tier.limits.aiFairUse}
            onChange={(e) => setLimit("aiFairUse", e.target.checked)}
          />
          AI fair use (no hard monthly cap)
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs sm:col-span-2">
          <span className="text-muted-foreground">Display name</span>
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.display.name}
            onChange={(e) => setDisplay("name", e.target.value)}
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Price / month USD</span>
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.display.priceMonthlyUsd ?? ""}
            onChange={(e) => setDisplay("priceMonthlyUsd", e.target.value)}
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Price / year USD</span>
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.display.priceYearlyUsd ?? ""}
            onChange={(e) => setDisplay("priceYearlyUsd", e.target.value)}
          />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-muted-foreground">Cloud label (pricing page)</span>
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.display.cloudSttLabel}
            onChange={(e) => setDisplay("cloudSttLabel", e.target.value)}
          />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-muted-foreground">AI label</span>
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.display.aiLabel}
            onChange={(e) => setDisplay("aiLabel", e.target.value)}
          />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-muted-foreground">Tagline</span>
          <input
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.display.tagline}
            onChange={(e) => setDisplay("tagline", e.target.value)}
          />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-muted-foreground">Bullets (one per line)</span>
          <textarea
            rows={4}
            className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={tier.display.bullets.join("\n")}
            onChange={(e) =>
              onChange({
                ...tier,
                display: {
                  ...tier.display,
                  bullets: e.target.value
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean),
                },
              })
            }
          />
        </label>
      </div>
    </div>
  );
}

export function AdminPlansPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<LaunchPlanConfig>(DEFAULT_LAUNCH_PLAN_CONFIG);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetPlanConfig();
      setConfig(res.config);
      setUpdatedAt(res.updatedAt);
      setUpdatedBy(res.updatedBy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load plan config.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await adminUpdatePlanConfig({ config });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (
      !window.confirm(
        "Reset all plan limits and pricing copy to launch defaults?",
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await adminResetPlanConfig();
      setConfig(res.config);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plans & quotas</CardTitle>
        <CardDescription>
          Stored in Firestore <code className="text-[10px]">adminConfig/plans</code>.
          Changes apply within ~60s for enforcement. Users see live values in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        ) : null}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {updatedAt ? (
              <p className="text-xs text-muted-foreground">
                Last saved {new Date(updatedAt).toLocaleString()}
                {updatedBy ? ` · ${updatedBy}` : ""}
              </p>
            ) : null}
            <label className="block text-xs">
              <span className="font-medium text-muted-foreground">Fair use tooltip</span>
              <textarea
                rows={2}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={config.fairUseTooltip}
                onChange={(e) =>
                  setConfig({ ...config, fairUseTooltip: e.target.value })
                }
              />
            </label>
            {TIER_IDS.map((id) => (
              <TierEditor
                key={id}
                id={id}
                tier={config.tiers[id]}
                onChange={(tier) =>
                  setConfig({
                    ...config,
                    tiers: { ...config.tiers, [id]: tier },
                  })
                }
              />
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Save plans
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void load()}
              >
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={saving}
                onClick={() => void reset()}
              >
                Reset to defaults
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
