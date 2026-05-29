"use client";

import type { KnowledgeBaseArticle } from "@/lib/help/knowledge-base-types";

type KbArticleViewProps = {
  article: KnowledgeBaseArticle;
  compact?: boolean;
};

export function KbArticleView({ article, compact }: KbArticleViewProps) {
  return (
    <article className={compact ? "space-y-4 text-sm" : "space-y-6"}>
      <header className="space-y-2">
        <h1
          className={
            compact
              ? "text-base font-semibold"
              : "text-xl font-semibold tracking-tight"
          }
        >
          {article.title}
        </h1>
        <p className="text-sm text-muted-foreground">{article.summary}</p>
        <p className="text-[11px] text-muted-foreground">
          About {article.readMinutes} min read
        </p>
      </header>

      {article.sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h2
            className={
              compact
                ? "text-sm font-semibold"
                : "text-base font-semibold"
            }
          >
            {section.heading}
          </h2>
          {section.paragraphs?.map((p) => (
            <p
              key={p.slice(0, 48)}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {p}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {section.bullets.map((b) => (
                <li key={b.slice(0, 48)}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </article>
  );
}
