"use client";

import { KbArticleView } from "@/components/help/kb-article-view";
import {
  getKnowledgeBaseArticle,
  KNOWLEDGE_BASE_ARTICLES,
  knowledgeBaseArticlePath,
} from "@/lib/help/knowledge-base";
import Link from "next/link";
import {
  BookOpen,
  Mic,
  Settings,
  Shield,
  Smartphone,
  Video,
  type LucideIcon,
} from "lucide-react";

const ARTICLE_ICONS: Record<string, LucideIcon> = {
  "on-device-modes": Shield,
  "teams-zoom-meet": Video,
  "android-mic-isolation": Smartphone,
};

type HelpGuidePanelProps = {
  articleSlug?: string | null;
  onOpenArticle?: (slug: string | null) => void;
};

export function HelpGuidePanel({
  articleSlug,
  onOpenArticle,
}: HelpGuidePanelProps) {
  const embedded = getKnowledgeBaseArticle(articleSlug ?? "");

  if (embedded && articleSlug) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <button
          type="button"
          className="text-left text-xs font-medium text-violet-600 underline dark:text-violet-400"
          onClick={() => onOpenArticle?.(null)}
        >
          ← Back to guides
        </button>
        <KbArticleView article={embedded} compact />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-muted-foreground">
        How-to guides for capture, meetings, and transcription.
      </p>

      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Knowledge base
      </p>
      <ul className="space-y-2">
        {KNOWLEDGE_BASE_ARTICLES.map((article) => {
          const Icon = ARTICLE_ICONS[article.slug] ?? BookOpen;
          return (
          <li key={article.slug}>
            <button
              type="button"
              onClick={() => onOpenArticle?.(article.slug)}
              className="flex w-full items-start gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-left hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              <span>
                <span className="block font-medium">{article.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {article.summary}
                </span>
              </span>
            </button>
          </li>
          );
        })}
      </ul>

      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Quick links
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
            href={knowledgeBaseArticlePath("teams-zoom-meet")}
            className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 hover:bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/30 dark:hover:bg-violet-950/50"
          >
            <Video className="h-4 w-4 shrink-0 text-violet-600" />
            <span>Open full page (shareable link)</span>
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
    </div>
  );
}
