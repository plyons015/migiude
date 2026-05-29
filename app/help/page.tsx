import {
  KNOWLEDGE_BASE_ARTICLES,
  knowledgeBaseArticlePath,
} from "@/lib/help/knowledge-base";
import Link from "next/link";

export default function HelpIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 pb-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
        <p className="text-sm text-muted-foreground">
          How-to guides for capture, meetings, and transcription
        </p>
      </header>
      <ul className="space-y-2">
        {KNOWLEDGE_BASE_ARTICLES.map((article) => (
          <li key={article.slug}>
            <Link
              href={knowledgeBaseArticlePath(article.slug)}
              className="block rounded-xl border border-border p-4 hover:bg-muted/40"
            >
              <p className="font-medium">{article.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {article.summary}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {article.readMinutes} min read
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
