"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { usePlanAndUsage } from "@/hooks/use-plan-and-usage";
import {
  deleteCustomTemplate,
  listCustomTemplates,
  upsertCustomTemplate,
} from "@/lib/meetings/custom-templates-store";
import {
  createCustomTemplateId,
  parseReportSectionsText,
  reportSectionsToText,
  sectionsToReportPrompt,
  type CustomMeetingTemplate,
} from "@/lib/meetings/template-schema";
import { BUILTIN_MEETING_TEMPLATES } from "@/lib/meetings/templates";
import {
  canCreateCustomTemplates,
  customTemplateLimitForPlan,
} from "@/lib/meetings/template-limits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutTemplate, Loader2, Plus, Trash2 } from "lucide-react";

const EMPTY_FORM = {
  label: "",
  description: "",
  defaultTitle: "Meeting — {date}",
  tags: "",
  libraryTag: "",
  agenda: "",
  reportSections: "Summary\nAction items",
};

export function MeetingTemplatesSettings() {
  const { user } = useAuthUser();
  const { plan } = usePlanAndUsage();
  const userId = user?.uid ?? null;
  const limit = customTemplateLimitForPlan(plan);
  const canCreate = canCreateCustomTemplates(plan);

  const [custom, setCustom] = useState<CustomMeetingTemplate[]>(() =>
    userId ? listCustomTemplates(userId) : [],
  );
  const [editing, setEditing] = useState<CustomMeetingTemplate | "new" | null>(
    null,
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const atLimit = custom.length >= limit;

  const refresh = () => {
    if (userId) setCustom(listCustomTemplates(userId));
  };

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
    setMsg(null);
  };

  const openEdit = (t: CustomMeetingTemplate) => {
    setForm({
      label: t.label,
      description: t.description,
      defaultTitle: t.defaultTitle,
      tags: t.tags.join(", "),
      libraryTag: t.libraryTag,
      agenda: t.agenda,
      reportSections: reportSectionsToText(t.reportSections),
    });
    setEditing(t);
    setMsg(null);
  };

  const saveForm = async () => {
    if (!userId || !canCreate) return;
    setBusy(true);
    setMsg(null);
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const libraryTag = form.libraryTag.trim() || tags[0] || "meeting";
      const reportSections = parseReportSectionsText(form.reportSections);
      if (!form.label.trim() || reportSections.length === 0) {
        setMsg("Label and at least one report section are required.");
        return;
      }
      if (editing === "new" && atLimit) {
        setMsg(`Plan limit: ${limit} custom templates.`);
        return;
      }

      const template: CustomMeetingTemplate = {
        id:
          editing !== "new" && editing
            ? editing.id
            : createCustomTemplateId(),
        label: form.label.trim(),
        description: form.description.trim(),
        defaultTitle: form.defaultTitle.trim() || "Meeting — {date}",
        tags: tags.length ? tags : [libraryTag],
        libraryTag,
        agenda: form.agenda,
        reportSections,
        reportPrompt: sectionsToReportPrompt(reportSections),
        preferCloud: true,
      };

      upsertCustomTemplate(userId, template);
      refresh();
      setEditing(null);
      setMsg("Template saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    if (!userId) return;
    deleteCustomTemplate(userId, id);
    refresh();
    if (editing !== "new" && editing?.id === id) setEditing(null);
  };

  const builtInSummary = useMemo(
    () => BUILTIN_MEETING_TEMPLATES.map((t) => t.label).join(", "),
    [],
  );

  return (
    <Card className={!canCreate ? "opacity-90" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutTemplate className="h-4 w-4" />
          Meeting templates
        </CardTitle>
        <CardDescription>
          Templates set title, Library tags, agenda, and AI report sections when
          you end a meeting. Free includes {builtInSummary}. Pro adds up to{" "}
          {customTemplateLimitForPlan("pro")} custom; Power up to{" "}
          {customTemplateLimitForPlan("power")}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Included</p>
          <ul className="space-y-1 text-sm">
            {BUILTIN_MEETING_TEMPLATES.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span>{t.label}</span>
                <Badge variant="secondary">Built-in</Badge>
              </li>
            ))}
          </ul>
        </div>

        {!canCreate ? (
          <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-3 py-3 text-sm dark:border-violet-800 dark:bg-violet-950/20">
            <p className="text-violet-950 dark:text-violet-100">
              Custom template creator is available on Pro and Power.
            </p>
            <Link
              href="/settings/#billing"
              className="mt-2 inline-block text-xs font-medium underline"
            >
              Upgrade in billing
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Custom: {custom.length} / {limit}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={atLimit || !userId}
                onClick={openNew}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New template
              </Button>
            </div>

            {custom.length > 0 ? (
              <ul className="space-y-2">
                {custom.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border p-2 text-sm"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => openEdit(t)}
                    >
                      <p className="font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Library · {t.libraryTag}
                      </p>
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${t.label}`}
                      onClick={() => remove(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            {editing ? (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">
                  {editing === "new" ? "New template" : "Edit template"}
                </p>
                <div className="space-y-1">
                  <Label htmlFor="tpl-label">Name</Label>
                  <input
                    id="tpl-label"
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                    value={form.label}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, label: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tpl-desc">Description</Label>
                  <input
                    id="tpl-desc"
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tpl-title">Title pattern</Label>
                  <input
                    id="tpl-title"
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                    value={form.defaultTitle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, defaultTitle: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tpl-tags">Tags (comma-separated)</Label>
                  <input
                    id="tpl-tags"
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                    value={form.tags}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tags: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tpl-library">Library series tag</Label>
                  <input
                    id="tpl-library"
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                    value={form.libraryTag}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, libraryTag: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tpl-agenda">Agenda (optional)</Label>
                  <textarea
                    id="tpl-agenda"
                    rows={3}
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                    value={form.agenda}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, agenda: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tpl-sections">
                    Report sections (one per line — AI &amp; Library export)
                  </Label>
                  <textarea
                    id="tpl-sections"
                    rows={4}
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm font-mono text-xs"
                    value={form.reportSections}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reportSections: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => void saveForm()}
                  >
                    {busy ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}

        {msg ? (
          <p className="text-xs text-muted-foreground">{msg}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
