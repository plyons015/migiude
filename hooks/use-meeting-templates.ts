"use client";

import {
  getSelectedTemplateId,
  listAllTemplatesForUser,
  listCustomTemplates,
  subscribeMeetingTemplates,
} from "@/lib/meetings/custom-templates-store";
import type { MeetingTemplate } from "@/lib/meetings/template-schema";
import { useSyncExternalStore } from "react";

const EMPTY_TEMPLATES: MeetingTemplate[] = [];

/** Cached snapshot — getSnapshot must return referentially stable values between store updates. */
let templatesCache: {
  userId: string | null | undefined;
  fingerprint: string;
  value: MeetingTemplate[];
} = { userId: undefined, fingerprint: "", value: EMPTY_TEMPLATES };

function templatesFingerprint(list: MeetingTemplate[]): string {
  return list.map((t) => t.id).join("\0");
}

function templatesSnapshot(userId: string | null): MeetingTemplate[] {
  const next = listAllTemplatesForUser(userId);
  const fingerprint = templatesFingerprint(next);
  if (
    templatesCache.userId === userId &&
    templatesCache.fingerprint === fingerprint
  ) {
    return templatesCache.value;
  }
  templatesCache = { userId, fingerprint, value: next };
  return next;
}

function subscribeTemplates(onStoreChange: () => void): () => void {
  return subscribeMeetingTemplates(() => {
    templatesCache.userId = undefined;
    onStoreChange();
  });
}

function selectedIdSnapshot(): string | null {
  return getSelectedTemplateId();
}

export function useMeetingTemplates(userId: string | null) {
  const templates = useSyncExternalStore(
    subscribeTemplates,
    () => templatesSnapshot(userId),
    () => EMPTY_TEMPLATES,
  );

  const selectedId = useSyncExternalStore(
    subscribeMeetingTemplates,
    selectedIdSnapshot,
    () => null,
  );

  const selected = selectedId
    ? (templates.find((t) => t.id === selectedId) ?? null)
    : null;

  const customCount = userId ? listCustomTemplates(userId).length : 0;

  return {
    templates,
    selectedId,
    selected: selected ?? (selectedId ? undefined : null),
    customCount,
  };
}
