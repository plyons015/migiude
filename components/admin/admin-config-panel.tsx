"use client";

import { adminGetAdminConfig, adminUpdateAdminConfig } from "@/lib/admin/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function AdminConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminEmails, setAdminEmails] = useState("");
  const [ipAllowlist, setIpAllowlist] = useState("");
  const [envEmails, setEnvEmails] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await adminGetAdminConfig();
      setAdminEmails(cfg.adminEmails.join(", "));
      setIpAllowlist(cfg.adminIpAllowlist.join(", "));
      setEnvEmails(cfg.envAdminEmails);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load admin config.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Admin config</CardTitle>
        <CardDescription>Manage Firestore-backed admin list and IP allowlist.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              ENV admins (read-only): {envEmails.join(", ") || "none"}
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Admin emails (Firestore)</label>
              <textarea
                rows={2}
                value={adminEmails}
                onChange={(e) => setAdminEmails(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="ops@example.com, owner@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Admin IP allowlist (Firestore)</label>
              <textarea
                rows={2}
                value={ipAllowlist}
                onChange={(e) => setIpAllowlist(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="203.0.113.4, 198.51.100.8"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  void adminUpdateAdminConfig({
                    adminEmails: adminEmails
                      .split(/[,;\s]+/)
                      .map((v) => v.trim().toLowerCase())
                      .filter(Boolean),
                    adminIpAllowlist: ipAllowlist
                      .split(/[,;\s]+/)
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                    .then(() => load())
                    .catch((e) => setError(String(e)))
                }
              >
                Save config
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
                Refresh
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
