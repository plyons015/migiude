export type KnowledgeBaseSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type KnowledgeBaseArticle = {
  slug: string;
  title: string;
  summary: string;
  readMinutes: number;
  sections: KnowledgeBaseSection[];
};
