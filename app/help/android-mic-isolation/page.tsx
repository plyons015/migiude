import { KbArticleView } from "@/components/help/kb-article-view";
import { androidMicIsolationArticle } from "@/lib/help/articles/android-mic-isolation";
import Link from "next/link";

export default function AndroidMicIsolationHelpPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 pb-8">
      <Link
        href="/help/"
        className="text-sm font-medium text-violet-600 underline dark:text-violet-400"
      >
        ← All guides
      </Link>
      <KbArticleView article={androidMicIsolationArticle} />
    </main>
  );
}
