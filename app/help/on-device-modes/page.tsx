import { KbArticleView } from "@/components/help/kb-article-view";
import { onDeviceModesArticle } from "@/lib/help/articles/on-device-modes";
import Link from "next/link";

export default function OnDeviceModesHelpPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 pb-8">
      <Link
        href="/help/"
        className="text-sm font-medium text-violet-600 underline dark:text-violet-400"
      >
        ← All guides
      </Link>
      <KbArticleView article={onDeviceModesArticle} />
    </main>
  );
}
