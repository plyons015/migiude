"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { MeetingRecord } from "@/lib/data/types";
import { format } from "date-fns";
import { Calendar, Link2, X } from "lucide-react";
import { useEffect, useState } from "react";

type ConnectMeetingDialogProps = {
  open: boolean;
  meetings: MeetingRecord[];
  currentMeetingId?: string;
  currentSeriesTag?: string;
  busy?: boolean;
  onClose: () => void;
  onConnect: (meetingId: string, seriesTag?: string, applySeriesToMeeting?: boolean) => void;
  onDisconnect: () => void;
  onSeriesOnly?: (seriesTag: string | undefined, meetingId?: string) => void;
};

export function ConnectMeetingDialog({
  open,
  meetings,
  currentMeetingId,
  currentSeriesTag,
  busy,
  onClose,
  onConnect,
  onDisconnect,
  onSeriesOnly,
}: ConnectMeetingDialogProps) {
  const [seriesInput, setSeriesInput] = useState(currentSeriesTag ?? "");
  const [applyToMeeting, setApplyToMeeting] = useState(true);
  const [pickedId, setPickedId] = useState(currentMeetingId ?? "");

  useEffect(() => {
    if (open) {
      setSeriesInput(currentSeriesTag ?? "");
      setPickedId(currentMeetingId ?? "");
    }
  }, [open, currentMeetingId, currentSeriesTag]);

  if (!open) return null;

  const seriesTrimmed = seriesInput.trim();

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-meeting-title"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 id="connect-meeting-title" className="text-base font-semibold">
              Connect to meeting
            </h2>
            <p className="text-xs text-muted-foreground">
              Link this note to a meeting or a topic series across meetings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Label className="text-xs">Meeting</Label>
          {meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No meetings yet. Finish a listen session first.
            </p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border">
              {meetings.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPickedId(m.id)}
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                      pickedId === m.id ? "bg-violet-50 dark:bg-violet-950/40" : ""
                    }`}
                  >
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{m.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(m.startedAt, "MMM d, yyyy")}
                        {m.seriesTag ? ` · ${m.seriesTag}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="series-tag" className="text-xs">
            Topic series (optional)
          </Label>
          <input
            id="series-tag"
            value={seriesInput}
            onChange={(e) => setSeriesInput(e.target.value)}
            placeholder="e.g. Q3-planning, Client-XYZ"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            disabled={busy}
          />
          <p className="text-[11px] text-muted-foreground">
            Use the same tag on related meetings to group them by theme. Groups
            sharing comes later.
          </p>
          {pickedId ? (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={applyToMeeting}
                onChange={(e) => setApplyToMeeting(e.target.checked)}
                disabled={busy || !seriesTrimmed}
              />
              Apply topic to selected meeting too
            </label>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            className="gap-1"
            disabled={busy || !pickedId}
            onClick={() =>
              onConnect(
                pickedId,
                seriesTrimmed || undefined,
                applyToMeeting && Boolean(seriesTrimmed),
              )
            }
          >
            <Link2 className="h-4 w-4" />
            Connect
          </Button>
          {onSeriesOnly && seriesTrimmed && !pickedId ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => onSeriesOnly(seriesTrimmed)}
            >
              Save topic only
            </Button>
          ) : null}
          {currentMeetingId ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          ) : null}
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
