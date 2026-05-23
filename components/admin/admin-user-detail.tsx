"use client";

import {
  adminGetUser,
  adminUpdateUser,
} from "@/lib/admin/client";
import type { AdminUserDetail } from "@/lib/admin/types";
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
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Props = {
  uid: string;
  onClose: () => void;
  onUpdated: () => void;
};

export function AdminUserDetail({ uid, onClose, onUpdated }: Props) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetUser(uid);
      setDetail(data);
      setNotes(data.adminNotes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user.");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveNotes = async () => {
    setSaving(true);
    setError(null);
    try {
      await adminUpdateUser({ uid, adminNotes: notes });
      await load();
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const extendTrial = async (days: number) => {
    setSaving(true);
    setError(null);
    try {
      const base =
        detail?.trialEndsAt && detail.trialEndsAt > Date.now()
          ? detail.trialEndsAt
          : Date.now();
      await adminUpdateUser({
        uid,
        trialEndsAt: base + days * 24 * 60 * 60 * 1000,
      });
      await load();
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trial update failed.");
    } finally {
      setSaving(false);
    }
  };

  const clearTrial = async () => {
    setSaving(true);
    try {
      await adminUpdateUser({ uid, trialEndsAt: null });
      await load();
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trial update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-red-700 dark:text-red-300">
          {error ?? "User not found."}
        </CardContent>
      </Card>
    );
  }

  const trialLabel = detail.trialEndsAt
    ? new Date(detail.trialEndsAt).toLocaleDateString()
    : "None";

  return (
    <Card className="border-zinc-300 dark:border-zinc-600">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{detail.email ?? detail.uid}</CardTitle>
          <CardDescription className="font-mono text-xs">
            {detail.uid}
          </CardDescription>
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? (
          <p className="text-red-700 dark:text-red-300">{error}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{detail.plan}</Badge>
          <Badge variant="outline">{detail.role}</Badge>
          {detail.suspended ? (
            <Badge className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
              Suspended
            </Badge>
          ) : (
            <Badge variant="outline">Active</Badge>
          )}
          {detail.emailVerified ? (
            <Badge variant="outline">Email verified</Badge>
          ) : (
            <Badge variant="outline">Unverified email</Badge>
          )}
        </div>
        <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            Created:{" "}
            <span className="text-foreground">
              {new Date(detail.createdAt).toLocaleString()}
            </span>
          </div>
          <div>
            Last login:{" "}
            <span className="text-foreground">
              {detail.lastLoginAt
                ? new Date(detail.lastLoginAt).toLocaleString()
                : "—"}
            </span>
          </div>
          <div>
            Platform:{" "}
            <span className="text-foreground">{detail.platform ?? "—"}</span>
          </div>
          <div>
            Trial ends:{" "}
            <span className="text-foreground">{trialLabel}</span>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => void extendTrial(7)}
          >
            +7 day trial
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => void clearTrial()}
          >
            Clear trial
          </Button>
          <Select
            value={detail.plan}
            disabled={saving}
            onValueChange={(plan) =>
              void adminUpdateUser({
                uid,
                plan: plan as "free" | "pro" | "business",
              }).then(() => load().then(onUpdated))
            }
          >
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Usage (last 7 days, UTC)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1 pr-2">Day</th>
                  <th className="py-1 pr-2">STT</th>
                  <th className="py-1 pr-2">AI</th>
                  <th className="py-1">Meetings</th>
                </tr>
              </thead>
              <tbody>
                {detail.usageByDay.map((row) => (
                  <tr key={row.day} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-1 pr-2 tabular-nums">{row.day}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {row.cloudSttChunks}
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{row.aiCalls}</td>
                    <td className="py-1 tabular-nums">{row.meetings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Admin notes (internal)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void saveNotes()}
          >
            {saving ? "Saving…" : "Save notes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
