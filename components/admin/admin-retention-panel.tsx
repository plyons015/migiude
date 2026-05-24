"use client";

import { adminGetRetention } from "@/lib/admin/client";
import type { RetentionPoint } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export function AdminRetentionPanel() {
  const [days, setDays] = useState(28);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<RetentionPoint[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await adminGetRetention(days);
      setSeries(out.series);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load retention.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const max = useMemo(
    () =>
      Math.max(
        1,
        ...series.map((d) => Math.max(d.signups, d.activeUsers)),
      ),
    [series],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Retention & signups</CardTitle>
          <CardDescription>Daily signups vs active users</CardDescription>
        </div>
        <div className="flex gap-2">
          {[14, 28, 56].map((d) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {series.map((row) => (
              <div key={row.day} className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{row.day}</span>
                  <span>
                    Signups {row.signups} · Active {row.activeUsers}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-2 rounded bg-violet-600"
                      style={{ width: `${Math.round((row.signups / max) * 100)}%` }}
                    />
                  </div>
                  <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-2 rounded bg-emerald-600"
                      style={{ width: `${Math.round((row.activeUsers / max) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
