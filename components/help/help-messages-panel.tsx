"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useUserSupportTickets } from "@/hooks/use-user-support-tickets";
import { submitSupportTicket } from "@/lib/support/submit-ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

function formatWhen(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HelpMessagesPanel() {
  const { user } = useAuthUser();
  const {
    tickets,
    loading,
    error,
    unreadCount,
    isTicketUnread,
    markTicketSeen,
    markAllRepliesSeen,
  } = useUserSupportTickets();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user) {
      setFeedback("Sign in to send a message.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const id = await submitSupportTicket(message, user.uid, user.email);
      setMessage("");
      setFeedback(`Sent — we’ll reply here (ref ${id.slice(0, 8)}…).`);
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        Sign in to view support messages.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Messages stay in the app — no email required. Replies appear when your
        ticket is resolved.
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      ) : (
        <>
          {unreadCount > 0 ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-xs text-amber-950 dark:text-amber-100">
                {unreadCount} new {unreadCount === 1 ? "reply" : "replies"}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 shrink-0 text-xs"
                onClick={() => markAllRepliesSeen()}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Mark all viewed
              </Button>
            </div>
          ) : null}
          <ul className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
            {tickets.map((t) => {
              const unread = isTicketUnread(t);
              return (
                <li
                  key={t.id}
                  className={`rounded-lg border p-3 text-sm ${
                    unread
                      ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                      : "border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {t.status}
                      </Badge>
                      {unread ? (
                        <Badge className="bg-amber-500 text-[10px] text-white hover:bg-amber-500">
                          New reply
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatWhen(t.updatedAt ?? t.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{t.message}</p>
                  {t.adminReply ? (
                    <div className="mt-2 rounded-md bg-violet-50 px-2 py-1.5 text-xs dark:bg-violet-950/40">
                      <span className="font-medium text-violet-900 dark:text-violet-200">
                        Support:{" "}
                      </span>
                      <span className="whitespace-pre-wrap text-violet-950 dark:text-violet-100">
                        {t.adminReply}
                      </span>
                    </div>
                  ) : t.status === "open" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Waiting for a reply…
                    </p>
                  ) : null}
                  {unread ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-7 px-2 text-xs"
                      onClick={() => markTicketSeen(t.id)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Mark as viewed
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
        <label className="text-xs font-medium">New message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Describe the issue or question (at least 10 characters)."
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          disabled={busy}
        />
        <p className="text-xs text-muted-foreground">
          At least 10 characters.{" "}
          {message.trim().length > 0 && message.trim().length < 10
            ? `${10 - message.trim().length} more needed.`
            : null}
        </p>
        <Button
          type="button"
          size="sm"
          disabled={busy || message.trim().length < 10}
          onClick={() => void handleSubmit()}
        >
          {busy ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send"
          )}
        </Button>
        {feedback ? (
          <p
            className={`text-xs ${
              feedback.startsWith("Sent")
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-red-700 dark:text-red-300"
            }`}
          >
            {feedback}
          </p>
        ) : null}
      </div>
    </div>
  );
}
