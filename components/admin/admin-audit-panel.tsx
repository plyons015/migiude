"use client";

import { adminListAuditLog } from "@/lib/admin/client";
import type { AdminAuditEntry } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function AdminAuditPanel() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await adminListAuditLog(80);
      setEntries(out.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load audit log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Admin audit log</CardTitle>
          <CardDescription>Critical admin actions and deletion trail</CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {entries.map((e) => (
              <li key={e.id} className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{e.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.createdAtMs ? new Date(e.createdAtMs).toLocaleString() : "—"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  actor {e.actorEmail} · target {e.targetEmail ?? e.targetUid ?? "—"}
                  {e.reasonCode ? ` · ${e.reasonCode}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
