export const MEETINGS_PATH = "/meetings/";

export type MeetingsScope = "all" | "mine" | "shared";

export type MeetingsUrlParams = {
  id?: string;
  /** Open full meeting room (summary, script, AI tabs). */
  room?: boolean;
  scope?: MeetingsScope;
  /** Follow-ups board across meetings. */
  view?: "board" | "list";
  tag?: string;
  /** Topic series across meetings (v1: meeting.seriesTag). */
  series?: string;
  topic?: string;
  open?: boolean;
  tab?: string;
};

export function meetingsUrl(params: MeetingsUrlParams = {}): string {
  const search = new URLSearchParams();
  if (params.id) search.set("id", params.id);
  if (params.room) search.set("room", "1");
  if (params.scope && params.scope !== "all") search.set("scope", params.scope);
  if (params.tag) search.set("tag", params.tag);
  if (params.series) search.set("series", params.series);
  if (params.topic) search.set("topic", params.topic);
  if (params.open) search.set("open", "1");
  if (params.view === "board") search.set("view", "board");
  if (params.tab) search.set("tab", params.tab);
  const q = search.toString();
  return q ? `${MEETINGS_PATH}?${q}` : MEETINGS_PATH;
}

/** Legacy /library/ URLs → meetings hub. */
export function meetingsUrlFromLibrarySearch(search: string): string {
  const params = new URLSearchParams(search);
  const id = params.get("id") ?? undefined;
  const tag = params.get("tag") ?? undefined;
  const topic = params.get("topic") ?? undefined;
  const open = params.get("open") === "1";
  if (params.get("view") === "board") {
    return meetingsUrl({ id, tab: "followups", room: Boolean(id) });
  }
  return meetingsUrl({ id, tag, topic, open });
}
