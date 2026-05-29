export const PEOPLE_PATH = "/people/";

export type PeopleTab = "friends" | "groups";

export type PeopleUrlParams = {
  tab?: PeopleTab;
  group?: string;
};

export function peopleUrl(params: PeopleUrlParams = {}): string {
  const search = new URLSearchParams();
  if (params.tab && params.tab !== "friends") search.set("tab", params.tab);
  if (params.group) search.set("group", params.group);
  const q = search.toString();
  return q ? `${PEOPLE_PATH}?${q}` : PEOPLE_PATH;
}
