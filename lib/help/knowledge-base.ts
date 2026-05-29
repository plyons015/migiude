import { androidMicIsolationArticle } from "@/lib/help/articles/android-mic-isolation";
import { onDeviceModesArticle } from "@/lib/help/articles/on-device-modes";
import { teamsZoomMeetArticle } from "@/lib/help/articles/teams-zoom-meet";
import type { KnowledgeBaseArticle } from "@/lib/help/knowledge-base-types";

export const KNOWLEDGE_BASE_ARTICLES: KnowledgeBaseArticle[] = [
  onDeviceModesArticle,
  teamsZoomMeetArticle,
  androidMicIsolationArticle,
];

export function getKnowledgeBaseArticle(
  slug: string,
): KnowledgeBaseArticle | undefined {
  return KNOWLEDGE_BASE_ARTICLES.find((a) => a.slug === slug);
}

export function knowledgeBaseArticlePath(slug: string): string {
  return `/help/${slug}/`;
}
