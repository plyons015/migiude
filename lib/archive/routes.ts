import type { ArchiveFilter } from "@/lib/archive/types";
import { meetingsUrlFromLibrarySearch } from "@/lib/meetings/routes";

export const ARCHIVE_PATH = "/archive/";

export type ArchiveUrlParams = {
  filter?: ArchiveFilter;
  id?: string;
  tag?: string;
};

export function archiveUrl(params: ArchiveUrlParams = {}): string {
  const search = new URLSearchParams();
  if (params.filter) search.set("filter", params.filter);
  if (params.id) {
    search.set("kind", "note");
    search.set("id", params.id);
  }
  if (params.tag) search.set("tag", params.tag);
  const q = search.toString();
  return q ? `${ARCHIVE_PATH}?${q}` : ARCHIVE_PATH;
}

export function archiveUrlFromNotesSearch(search: string): string {
  const params = new URLSearchParams(search);
  if (params.get("tab") === "todos") {
    return archiveUrl({ filter: "todos" });
  }
  const id = params.get("id") ?? undefined;
  return archiveUrl({
    filter: "notes",
    id,
    tag: params.get("tag") ?? undefined,
  });
}

/** Legacy /library/ → meetings hub. */
export function archiveUrlFromLibrarySearch(search: string): string {
  return meetingsUrlFromLibrarySearch(search);
}
