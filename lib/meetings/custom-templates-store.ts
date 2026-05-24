import {
  customMeetingTemplateSchema,
  type CustomMeetingTemplate,
  type MeetingTemplate,
} from "@/lib/meetings/template-schema";
import { BUILTIN_MEETING_TEMPLATES } from "@/lib/meetings/templates";

const STORE_KEY = "migiude-custom-meeting-templates-v1";
const SELECTED_KEY = "migiude-selected-meeting-template-id";

type StoreShape = Record<string, CustomMeetingTemplate[]>;

function readStore(): StoreShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoreShape;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("migiude-templates"));
}

export function subscribeMeetingTemplates(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("migiude-templates", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("migiude-templates", handler);
    window.removeEventListener("storage", handler);
  };
}

export function listCustomTemplates(userId: string): CustomMeetingTemplate[] {
  const list = readStore()[userId] ?? [];
  return list.filter((t) => customMeetingTemplateSchema.safeParse(t).success);
}

export function saveCustomTemplates(
  userId: string,
  templates: CustomMeetingTemplate[],
): void {
  const store = readStore();
  store[userId] = templates.map((t) => customMeetingTemplateSchema.parse(t));
  writeStore(store);
}

export function upsertCustomTemplate(
  userId: string,
  template: CustomMeetingTemplate,
): void {
  const parsed = customMeetingTemplateSchema.parse(template);
  const list = listCustomTemplates(userId);
  const idx = list.findIndex((t) => t.id === parsed.id);
  if (idx >= 0) list[idx] = parsed;
  else list.push(parsed);
  saveCustomTemplates(userId, list);
}

export function deleteCustomTemplate(userId: string, id: string): void {
  saveCustomTemplates(
    userId,
    listCustomTemplates(userId).filter((t) => t.id !== id),
  );
}

export function listAllTemplatesForUser(userId: string | null): MeetingTemplate[] {
  const custom = userId ? listCustomTemplates(userId) : [];
  return [...BUILTIN_MEETING_TEMPLATES, ...custom];
}

export function resolveMeetingTemplate(
  id: string,
  userId: string | null,
): MeetingTemplate | undefined {
  return listAllTemplatesForUser(userId).find((t) => t.id === id);
}

export function getSelectedTemplateId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_KEY);
}

export function setSelectedTemplateId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(SELECTED_KEY, id);
  else localStorage.removeItem(SELECTED_KEY);
  window.dispatchEvent(new Event("migiude-templates"));
}

export function getSelectedTemplate(
  userId: string | null,
): MeetingTemplate | null {
  const id = getSelectedTemplateId();
  if (!id) return null;
  return resolveMeetingTemplate(id, userId) ?? null;
}
