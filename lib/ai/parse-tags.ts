/** Parse AI suggest_tags output into tag strings. */
export function parseTagsFromAi(text: string): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const line of text.split("\n")) {
    const cleaned = line
      .replace(/^[-*•\d.]+\s*/, "")
      .replace(/^#+\s*/, "")
      .trim()
      .replace(/[.,;]+$/, "");
    if (!cleaned || cleaned.length > 40) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(cleaned);
    if (tags.length >= 8) break;
  }

  return tags;
}
