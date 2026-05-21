"use client";

import { useAiSettings } from "@/hooks/use-ai-settings";
import { useMeetings } from "@/hooks/use-meetings";
import { useTodos } from "@/hooks/use-todos";
import { useAuthUser } from "@/hooks/use-auth-user";
import { aiService, AiServiceError } from "@/lib/ai/ai-service";
import {
  buildDailyRecapPrompt,
  meetingsYesterday,
} from "@/lib/meetings/daily-recap-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format, startOfDay } from "date-fns";
import { Loader2, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const RECAP_CACHE_KEY = "migiude-daily-recap";

function todayKey(): string {
  return format(startOfDay(new Date()), "yyyy-MM-dd");
}

type DailyRecapCardProps = {
  userId: string;
};

export function DailyRecapCard({ userId }: DailyRecapCardProps) {
  const { meetings } = useMeetings(userId);
  const { openTodos } = useTodos(userId);
  const { provider } = useAiSettings();
  const { ensureSignedIn } = useAuthUser();
  const [recap, setRecap] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yesterdayMeetings = meetingsYesterday(meetings);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(RECAP_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { date: string; text: string };
      if (parsed.date === todayKey()) setRecap(parsed.text);
    } catch {
      /* ignore */
    }
  }, []);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await ensureSignedIn();
      const prompt = buildDailyRecapPrompt(yesterdayMeetings, openTodos);
      const out = await aiService.dailyRecap(prompt, provider);
      setRecap(out.result);
      localStorage.setItem(
        RECAP_CACHE_KEY,
        JSON.stringify({ date: todayKey(), text: out.result }),
      );
    } catch (e) {
      setError(
        e instanceof AiServiceError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Recap failed",
      );
    } finally {
      setBusy(false);
    }
  }, [yesterdayMeetings, openTodos, provider, ensureSignedIn]);

  const hasContext = yesterdayMeetings.length > 0 || openTodos.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-base">Daily recap</CardTitle>
        </div>
        <CardDescription>
          Yesterday&apos;s meetings and open follow-ups
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!recap ? (
          <>
            <p className="text-sm text-muted-foreground">
              {hasContext
                ? `${yesterdayMeetings.length} meeting(s), ${openTodos.length} open todo(s)`
                : "Nothing from yesterday yet — run a meeting or save todos first."}
            </p>
            <button
              type="button"
              disabled={busy || !hasContext}
              onClick={() => void generate()}
              className="rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </span>
              ) : (
                "Generate recap"
              )}
            </button>
          </>
        ) : (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{recap}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void generate()}
              className="text-xs text-muted-foreground underline"
            >
              Refresh recap
            </button>
          </>
        )}
        {error ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
