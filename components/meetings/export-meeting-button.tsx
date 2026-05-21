"use client";

import { useMeetingAppends } from "@/hooks/use-meeting-appends";
import { useTodos } from "@/hooks/use-todos";
import { copyToClipboard } from "@/lib/clipboard";
import { buildMeetingMarkdownExport } from "@/lib/meetings/export-markdown";
import type { MeetingRecord } from "@/lib/data/types";
import { Copy } from "lucide-react";
import { useState } from "react";

type ExportMeetingButtonProps = {
  userId: string;
  meeting: MeetingRecord;
};

export function ExportMeetingButton({
  userId,
  meeting,
}: ExportMeetingButtonProps) {
  const { appends } = useMeetingAppends(userId, meeting.id);
  const { todos } = useTodos(userId);
  const [msg, setMsg] = useState<string | null>(null);

  const handleExport = async () => {
    const md = buildMeetingMarkdownExport(meeting, appends, todos);
    const ok = await copyToClipboard(md);
    setMsg(ok ? "Copied Markdown to clipboard" : "Copy failed");
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void handleExport()}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium"
      >
        <Copy className="h-3.5 w-3.5" />
        Export Markdown
      </button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
