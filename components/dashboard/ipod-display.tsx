"use client";

import {
  computeUpgradeNudge,
  dismissUpgradeNudge,
  isUpgradeNudgeDismissed,
} from "@/lib/plan/upgrade-nudges";
import {
  nudgeToIpodContent,
  pickRotatingBenefit,
  toneClasses,
  type IpodDisplayContent,
} from "@/lib/plan/upgrade-display-messages";
import { APP_NAME } from "@/lib/branding/app-name";
import { usePlanAndUsage } from "@/hooks/use-plan-and-usage";
import Link from "next/link";
import { IpodTodoStrip } from "@/components/dashboard/ipod-todo-strip";
import type { TodoRecord } from "@/lib/data/types";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";

function subscribeClientPrefs() {
  return () => {};
}

const ROTATE_MS = 8_000;
/** Auto-rotate cycles: greeting → upgrade 1 → upgrade 2 */
const AUTO_PAGE_COUNT = 3;
/** Swipe-only page when todos exist */
const TODOS_PAGE_INDEX = 3;

type IpodDisplayProps = {
  userId: string;
  greeting: string;
  subtitle?: string;
  holdHint?: string | null;
  todos?: TodoRecord[];
};

export function IpodDisplay({
  userId,
  greeting,
  subtitle,
  holdHint,
  todos = [],
}: IpodDisplayProps) {
  const { plan, data } = usePlanAndUsage();
  const nudgeDismissedStored = useSyncExternalStore(
    subscribeClientPrefs,
    isUpgradeNudgeDismissed,
    () => false,
  );
  const [nudgeDismissedLocal, setNudgeDismissedLocal] = useState(false);
  const nudgeDismissed = nudgeDismissedStored || nudgeDismissedLocal;
  const [benefitIndex, setBenefitIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const pauseRotationRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const hasTodos = todos.length > 0;
  const maxPageIndex = plan === "free" && hasTodos ? TODOS_PAGE_INDEX : AUTO_PAGE_COUNT - 1;

  const nudge = useMemo(
    () =>
      plan === "free" ? computeUpgradeNudge(data) : { show: false as const },
    [plan, data],
  );

  // Stable auto-rotate: greeting → upgrade nudge 1 → upgrade nudge 2 → repeat.
  useEffect(() => {
    if (plan !== "free" || holdHint) return;

    const tick = () => {
      if (pauseRotationRef.current) return;
      setPageIndex((prev) => {
        if (prev >= TODOS_PAGE_INDEX) return prev;
        const next = (prev + 1) % AUTO_PAGE_COUNT;
        if (next === 2) {
          setBenefitIndex((i) => i + 1);
        }
        return next;
      });
    };

    const id = window.setInterval(tick, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [holdHint, plan]);

  const content: IpodDisplayContent = useMemo(() => {
    if (holdHint) {
      return { id: "hold-hint", tone: "neutral", line1: holdHint };
    }

    if (plan === "free") {
      if (pageIndex === 0) {
        return {
          id: "home-greeting",
          tone: "neutral",
          line1: greeting,
          line2: subtitle,
        };
      }

      if (pageIndex === 1) {
        if (nudge.show && !nudgeDismissed) {
          return nudgeToIpodContent(nudge);
        }
        const first = pickRotatingBenefit(0);
        return { id: "upgrade-1", ...first };
      }

      if (pageIndex === 2) {
        const second = pickRotatingBenefit(benefitIndex + 1);
        return { id: `upgrade-2-${benefitIndex}`, ...second };
      }

      return {
        id: "home-todos",
        tone: "neutral",
        line1: greeting,
        line2: subtitle,
      };
    }

    return {
      id: "home",
      tone: "neutral",
      line1: greeting,
      line2: subtitle,
    };
  }, [
    holdHint,
    plan,
    nudge,
    nudgeDismissed,
    benefitIndex,
    greeting,
    subtitle,
    pageIndex,
  ]);

  const tones = toneClasses(content.tone);
  const showTodos =
    (content.id === "home-todos" || (plan !== "free" && content.id === "home")) &&
    hasTodos;

  const handleDismiss = useCallback(() => {
    if (content.id.startsWith("nudge-")) {
      dismissUpgradeNudge(7);
      setNudgeDismissedLocal(true);
    }
  }, [content.id]);

  const handlePointerDown = useCallback((e: ReactPointerEvent) => {
    pauseRotationRef.current = true;
    touchStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent) => {
      pauseRotationRef.current = false;
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;

      if (dx < 0) {
        setPageIndex((i) => Math.min(maxPageIndex, i + 1));
      } else {
        setPageIndex((i) => Math.max(0, i - 1));
      }
    },
    [maxPageIndex],
  );

  const handlePointerCancel = useCallback(() => {
    pauseRotationRef.current = false;
    touchStartRef.current = null;
  }, []);

  const pageDots =
    plan === "free" && !holdHint
      ? hasTodos
        ? 4
        : AUTO_PAGE_COUNT
      : 0;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-300/80 shadow-inner dark:border-zinc-700",
        tones.shell,
        "transition-colors duration-500",
      )}
    >
      <div className="border-b border-black/5 px-3 py-1.5 dark:border-white/10">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {APP_NAME}
        </p>
      </div>
      <div
        className={cn(
          "relative px-4 py-4",
          showTodos ? "min-h-36" : "min-h-30",
        )}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
      >
        {content.dismissible && !holdHint ? (
          <button
            type="button"
            className="absolute right-2 top-2 rounded p-1 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
            onClick={handleDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <div
          key={content.id}
          className={cn("animate-ipod-fade-in space-y-1 pr-6", tones.text)}
        >
          <p className="text-sm font-semibold leading-snug">{content.line1}</p>
          {content.line2 ? (
            <p className={cn("text-xs leading-relaxed", tones.sub)}>
              {content.line2}
            </p>
          ) : null}
          {content.linkHref && content.linkLabel ? (
            <Link
              href={content.linkHref}
              className="inline-block pt-1 text-xs font-medium underline underline-offset-2"
            >
              {content.linkLabel}
            </Link>
          ) : null}
          {showTodos ? (
            <IpodTodoStrip userId={userId} todos={todos} />
          ) : null}
        </div>

        {pageDots > 1 ? (
          <div
            className="mt-3 flex justify-center gap-1.5"
            aria-label="iPod screen pages"
          >
            {Array.from({ length: pageDots }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === pageIndex
                    ? "bg-zinc-700 dark:bg-zinc-200"
                    : "bg-zinc-400/50 dark:bg-zinc-500/50",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
