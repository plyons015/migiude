"use client";

import { AdminSupportPanel } from "@/components/admin/admin-support-panel";
import { AdminUserDetail } from "@/components/admin/admin-user-detail";
import {
  adminGetDashboard,
  adminListFlags,
  adminListUsers,
  adminResolveFlag,
  adminUpdateUser,
} from "@/lib/admin/client";
import { downloadUsersCsv } from "@/lib/admin/export-users-csv";
import type { AdminDashboard, AdminFlag, AdminUserRow } from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CreditCard,
  Download,
  Loader2,
  MessageCircle,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AdminTab = "overview" | "users" | "support" | "flags";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">
          {hint}
        </CardContent>
      ) : null}
    </Card>
  );
}

const TAB_LABELS: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "support", label: "Support" },
  { id: "flags", label: "Flags" },
];

export function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [flags, setFlags] = useState<AdminFlag[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const load = useCallback(async (token?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [dash, userRes, flagRes] = await Promise.all([
        adminGetDashboard(),
        adminListUsers(token ? { pageToken: token, limit: 50 } : { limit: 50 }),
        adminListFlags(),
      ]);
      setDashboard(dash);
      setUsers(userRes.users);
      setNextPageToken(userRes.nextPageToken);
      setPageToken(token ?? null);
      setFlags(flagRes.flags);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const dash = await adminGetDashboard();
      setDashboard(dash);
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.uid.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false),
    );
  }, [users, search]);

  const handlePlanChange = async (uid: string, plan: string) => {
    setBusyUid(uid);
    try {
      await adminUpdateUser({
        uid,
        plan: plan as "free" | "pro" | "business",
      });
      await load(pageToken ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyUid(null);
    }
  };

  const handleSuspend = async (uid: string, suspended: boolean) => {
    setBusyUid(uid);
    try {
      await adminUpdateUser({ uid, suspended });
      await load(pageToken ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyUid(null);
    }
  };

  const handleResolveFlag = async (flagId: string) => {
    try {
      await adminResolveFlag(flagId, "resolved");
      const flagRes = await adminListFlags();
      setFlags(flagRes.flags);
      await refreshDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resolve flag.");
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Admin dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Users, usage, support, and abuse monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load(pageToken ?? undefined)}
            disabled={loading}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/">Back to app</Link>
          </Button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {id === "support" && dashboard && dashboard.support.open > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">
                {dashboard.support.open}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {tab === "overview" && dashboard ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total users"
              value={dashboard.users.total}
              hint={`${dashboard.users.activeLast7d} active (7d)`}
            />
            <StatCard
              label="Cloud STT chunks today"
              value={dashboard.usage.today.cloudSttChunks}
              hint={`~${Math.round((dashboard.usage.today.cloudSttChunks * 8) / 60)} min est.`}
            />
            <StatCard
              label="AI calls today"
              value={dashboard.usage.today.aiCalls}
              hint={`${dashboard.usage.today.activeUsers} users with usage`}
            />
            <StatCard
              label="Open flags"
              value={dashboard.flags.open}
              hint={`${dashboard.support.open} open support tickets`}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Subscriptions & billing
                </CardTitle>
                <CardDescription>{dashboard.billing.message}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  Stripe:{" "}
                  <Badge
                    variant={
                      dashboard.billing.stripeConfigured
                        ? "default"
                        : "outline"
                    }
                  >
                    {dashboard.billing.stripeConfigured
                      ? "Configured"
                      : "Not connected"}
                  </Badge>
                </p>
                <p className="text-muted-foreground">
                  MRR / churn / failed payments appear here after Stripe
                  webhooks + Firestore sync.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4" />
                  Top cloud STT today
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.usage.topCloudUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No usage yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {dashboard.usage.topCloudUsers.map((u) => (
                      <li
                        key={u.uid}
                        className="flex justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800"
                      >
                        <button
                          type="button"
                          className="truncate text-left underline-offset-2 hover:underline"
                          onClick={() => {
                            setSelectedUid(u.uid);
                            setTab("users");
                          }}
                        >
                          {u.email ?? u.uid.slice(0, 8)}
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {u.plan}
                          </Badge>
                        </button>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {u.cloudSttChunks} chunks
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {tab === "users" ? (
        <>
          {selectedUid ? (
            <AdminUserDetail
              uid={selectedUid}
              onClose={() => setSelectedUid(null)}
              onUpdated={() => void load(pageToken ?? undefined)}
            />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Users
              </CardTitle>
              <CardDescription>
                Click a row for detail, 7-day usage, notes, and trial extension.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <input
                  type="search"
                  placeholder="Search email or UID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full max-w-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={filteredUsers.length === 0}
                  onClick={() => downloadUsersCsv(filteredUsers)}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Today</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.uid}
                        className={`cursor-pointer border-b border-zinc-100 dark:border-zinc-800 ${
                          selectedUid === u.uid
                            ? "bg-zinc-50 dark:bg-zinc-900/60"
                            : "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                        }`}
                        onClick={() => setSelectedUid(u.uid)}
                      >
                        <td className="max-w-[200px] truncate py-2 pr-3">
                          {u.email ?? "—"}
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {u.uid.slice(0, 12)}…
                          </div>
                        </td>
                        <td
                          className="py-2 pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Select
                            value={u.plan}
                            disabled={busyUid === u.uid}
                            onValueChange={(v) =>
                              void handlePlanChange(u.uid, v)
                            }
                          >
                            <SelectTrigger className="h-8 w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-xs text-muted-foreground">
                          STT {u.usageToday.cloudSttChunks} · AI{" "}
                          {u.usageToday.aiCalls}
                        </td>
                        <td className="py-2 pr-3">
                          {u.suspended ? (
                            <Badge className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                              Suspended
                            </Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </td>
                        <td
                          className="py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyUid === u.uid}
                            onClick={() =>
                              void handleSuspend(u.uid, !u.suspended)
                            }
                          >
                            {u.suspended ? "Unsuspend" : "Suspend"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {nextPageToken ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void load(nextPageToken)}
                >
                  Load more users
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === "support" ? (
        <AdminSupportPanel onTicketResolved={() => void refreshDashboard()} />
      ) : null}

      {tab === "flags" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Abuse & flags
            </CardTitle>
            <CardDescription>
              Auto-flag when a user exceeds ~400 cloud STT chunks in one day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No flags.</p>
            ) : (
              <ul className="space-y-2">
                {flags.map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                  >
                    <div>
                      <span className="font-medium">{f.reason ?? "flag"}</span>
                      <button
                        type="button"
                        className="ml-2 text-muted-foreground underline-offset-2 hover:underline"
                        onClick={() => {
                          if (f.uid) {
                            setSelectedUid(f.uid);
                            setTab("users");
                          }
                        }}
                      >
                        {f.uid?.slice(0, 8)} · {f.cloudSttChunks ?? "?"} chunks
                      </button>
                      <Badge variant="outline" className="ml-2">
                        {f.status ?? "open"}
                      </Badge>
                    </div>
                    {f.status === "open" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleResolveFlag(f.id)}
                      >
                        Resolve
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "overview" && dashboard && dashboard.support.open > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              Open support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {dashboard.support.open} open ticket
              {dashboard.support.open === 1 ? "" : "s"} —{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => setTab("support")}
              >
                View inbox
              </button>
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
