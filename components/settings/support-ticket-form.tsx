"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthUser } from "@/hooks/use-auth-user";
import { submitSupportTicket } from "@/lib/support/submit-ticket";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function SupportTicketForm() {
  const { user } = useAuthUser();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user) {
      setFeedback("Sign in to contact support.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const ticketId = await submitSupportTicket(
        message,
        user.uid,
        user.email,
      );
      setMessage("");
      setFeedback(
        `Message sent (ticket ${ticketId.slice(0, 8)}…). We’ll follow up by email when possible.`,
      );
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contact support</CardTitle>
        <CardDescription>
          Describe the issue or question (at least 10 characters). We typically
          respond within one business day.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What happened? Include steps to reproduce if it’s a bug."
          rows={4}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          disabled={busy || !user}
        />
        <p className="text-xs text-muted-foreground">
          Messages must be at least 10 characters.{" "}
          {message.trim().length > 0 && message.trim().length < 10
            ? `${10 - message.trim().length} more needed.`
            : null}
        </p>
        <Button
          type="button"
          size="sm"
          disabled={busy || !user || message.trim().length < 10}
          onClick={() => void handleSubmit()}
        >
          {busy ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send message"
          )}
        </Button>
        {feedback ? (
          <p
            className={`text-xs ${
              feedback.startsWith("Message sent")
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-red-700 dark:text-red-300"
            }`}
          >
            {feedback}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
