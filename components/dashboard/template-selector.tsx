"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setSelectedTemplateId } from "@/lib/meetings/custom-templates-store";
import type { MeetingTemplate } from "@/lib/meetings/template-schema";
import { BUILTIN_MEETING_TEMPLATES } from "@/lib/meetings/templates";

const QUICK_VALUE = "__quick__";

type TemplateSelectorProps = {
  templates: MeetingTemplate[];
  selectedId: string | null;
  onSelect: (template: MeetingTemplate | null) => void;
};

export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
}: TemplateSelectorProps) {
  const custom = templates.filter((t) => !t.builtIn);
  const value = selectedId ?? QUICK_VALUE;

  return (
    <div className="mx-auto w-full max-w-sm space-y-1">
      <label
        htmlFor="meeting-template"
        className="block text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        Meeting template
      </label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === QUICK_VALUE) {
            setSelectedTemplateId(null);
            onSelect(null);
            return;
          }
          setSelectedTemplateId(v);
          const t = templates.find((x) => x.id === v) ?? null;
          onSelect(t);
        }}
      >
        <SelectTrigger id="meeting-template" className="h-10 w-full">
          <SelectValue placeholder="Quick capture" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={QUICK_VALUE}>
            Quick capture — on-device tap
          </SelectItem>
          {BUILTIN_MEETING_TEMPLATES.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label} — cloud report
            </SelectItem>
          ))}
          {custom.length > 0 ? (
            <>
              {custom.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label} — custom
                </SelectItem>
              ))}
            </>
          ) : null}
        </SelectContent>
      </Select>
      {selectedId ? (
        <p className="text-center text-[10px] text-violet-600 dark:text-violet-400">
          Cloud session · tags Library as{" "}
          {templates.find((t) => t.id === selectedId)?.libraryTag}
        </p>
      ) : (
        <p className="text-center text-[10px] text-muted-foreground">
          Tap mic · on-device · Hold 5s · cloud
        </p>
      )}
    </div>
  );
}
