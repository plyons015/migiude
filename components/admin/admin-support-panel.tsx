"use client";

import {
  adminListSupportTickets,
  adminUpdateSupportTicket,
} from "@/lib/admin/client";
import { formatFirestoreTimestamp } from "@/lib/admin/format-timestamp";
import type { AdminSupportTicket } from "@/lib/admin/types";
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
import { Loader2, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Props = {
  onTicketResolved?: () => void;
};

export function AdminSupportPanel({ onTicketResolved }: Props) {
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListSupportTickets({ status: filter, limit: 50 });
      setTickets(res.tickets);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveTicket = async (ticket: AdminSupportTicket) => {
    setBusyId(ticket.id);
    setError(null);
    try {
      await adminUpdateSupportTicket({
        ticketId: ticket.id,
        status: "resolved",
        adminReply: replyDraft[ticket.id]?.trim() || undefined,
      });
      await load();
      onTicketResolved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const reopenTicket = async (ticketId: string) => {
    setBusyId(ticketId);
    try {
      await adminUpdateSupportTicket({ ticketId, status: "open" });
      await load();
      onTicketResolved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" />
          Support inbox
        </CardTitle>
        <CardDescription>
          Messages submitted from Settings → Contact support.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filter}
            onValueChange={(v) =>
              setFilter(v as "open" | "resolved" | "all")
            }
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
          >
            Refresh
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets.</p>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">
                      {t.email ?? t.uid.slice(0, 12)}
                    </span>
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {t.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatFirestoreTimestamp(t.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-foreground">{t.message}</p>
                {t.adminReply ? (
                  <p className="mt-2 rounded-md bg-zinc-50 px-2 py-1 text-xs text-muted-foreground dark:bg-zinc-900">
                    Reply: {t.adminReply}
                  </p>
                ) : null}
                {t.status === "open" ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      placeholder="Optional internal reply note…"
                      value={replyDraft[t.id] ?? ""}
                      onChange={(e) =>
                        setReplyDraft((prev) => ({
                          ...prev,
                          [t.id]: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === t.id}
                      onClick={() => void resolveTicket(t)}
                    >
                      Mark resolved
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={busyId === t.id}
                    onClick={() => void reopenTicket(t.id)}
                  >
                    Reopen
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
