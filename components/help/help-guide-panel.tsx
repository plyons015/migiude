"use client";

import Link from "next/link";
import { BookOpen, Mic, Settings, Shield } from "lucide-react";

export function HelpGuidePanel() {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-muted-foreground">
        Guides and FAQs will live here in the final v1 phase. For now, use these
        starting points:
      </p>
      <ul className="space-y-2">
        <li>
          <Link
            href="/onboarding/"
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <BookOpen className="h-4 w-4 shrink-0 text-violet-600" />
            <span>Replay onboarding</span>
          </Link>
        </li>
        <li>
          <Link
            href="/dashboard/"
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <Mic className="h-4 w-4 shrink-0 text-violet-600" />
            <span>Listen — meetings & quick capture</span>
          </Link>
        </li>
        <li>
          <Link
            href="/settings/"
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <Settings className="h-4 w-4 shrink-0 text-violet-600" />
            <span>Settings — transcription & privacy</span>
          </Link>
        </li>
        <li>
          <Link
            href="/setup/"
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <Shield className="h-4 w-4 shrink-0 text-violet-600" />
            <span>Setup — build & deploy notes</span>
          </Link>
        </li>
      </ul>
      <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-950 dark:bg-violet-950/40 dark:text-violet-100">
        Planned: searchable knowledge base, how-to articles, and tips inside this
        Help panel.
      </p>
    </div>
  );
}
