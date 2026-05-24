"use client";

import { adminListClientErrors } from "@/lib/admin/client";
import type { AdminClientError } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function AdminErrorsPanel() {
  const [errors, setErrors] = useState<AdminClientError[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await adminListClientErrors(60);
      setErrors(out.errors);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load errors.");
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
          <CardTitle className="text-base">Client errors (Android/web)</CardTitle>
          <CardDescription>Recent user-reported crashes and runtime errors</CardDescription>
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
            {errors.map((row) => (
              <li key={row.id} className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                <p className="font-medium">{row.message}</p>
                <p className="text-xs text-muted-foreground">
                  {row.platform ?? "unknown"} · {row.route ?? "—"} · {row.email ?? row.uid ?? "—"} ·{" "}
                  {row.createdAtMs ? new Date(row.createdAtMs).toLocaleString() : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
