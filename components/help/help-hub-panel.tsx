"use client";

import { HelpGuidePanel } from "@/components/help/help-guide-panel";
import { HelpMessagesPanel } from "@/components/help/help-messages-panel";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

type Tab = "guide" | "messages";

type Props = {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
  unreadCount?: number;
};

export function HelpHubPanel({
  open,
  onClose,
  initialTab = "guide",
  unreadCount = 0,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close help"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-hub-title"
        className="relative z-10 flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col rounded-2xl border border-zinc-200 bg-background shadow-xl dark:border-zinc-700"
      >
        <header className="flex items-start justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <div>
            <h2 id="help-hub-title" className="text-lg font-semibold">
              Help
            </h2>
            <p className="text-xs text-muted-foreground">
              Guides & support messages
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </header>

        <nav className="flex gap-1 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setTab("guide")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium ${
              tab === "guide"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-muted-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Guide
          </button>
          <button
            type="button"
            onClick={() => setTab("messages")}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium ${
              tab === "messages"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-muted-foreground"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            Messages
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "guide" ? (
            <HelpGuidePanel />
          ) : (
            <HelpMessagesPanel />
          )}
        </div>
      </div>
    </div>
  );
}
