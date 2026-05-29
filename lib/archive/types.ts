/** List filter chips on the Notepad screen (notes & personal todos only). */
export type ArchiveFilter = "all" | "notes" | "todos";

/** Reserved for friend-list / shared rows (not implemented yet). */
export type ArchiveVisibility = "private" | "shared";

export type ArchiveSelection = { kind: "note"; id: string } | null;
