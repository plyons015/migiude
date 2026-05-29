"use client";

import { Button } from "@/components/ui/button";
import type { CollaboratorAppend } from "@/lib/collaboration/types";
import { format } from "date-fns";
import { Check, MessageSquare, X } from "lucide-react";
import { useState } from "react";

type AppendThreadProps = {
  appends: CollaboratorAppend[];
  isOwner: boolean;
  canAppend: boolean;
  onAccept?: (appendId: string) => void;
  onIgnore?: (appendId: string) => void;
  onSubmitAppend?: (body: string) => void;
};

/**
 * Threaded collaborator refinements (placeholder until Firestore subcollection).
 */
export function AppendThread({
  appends,
  isOwner,
  canAppend,
  onAccept,
  onIgnore,
  onSubmitAppend,
}: AppendThreadProps) {
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {isOwner
          ? "Accept merges into your working copy; ignore hides the card. Replies ship with workspace v2."
          : "Read-only core transcript — add refinements below. Changes queue offline and sync later."}
      </p>

      {appends.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collaborator appends yet.</p>
      ) : (
        <ul className="space-y-2">
          {appends.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">
                  {a.authorDisplayName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {format(a.createdAt, "MMM d HH:mm")}
                </span>
              </div>
              <p className="mt-1 leading-relaxed">{a.body}</p>
              {a.status === "pending" && isOwner ? (
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 gap-1 text-xs"
                    onClick={() => onAccept?.(a.id)}
                  >
                    <Check className="h-3 w-3" />
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs"
                    onClick={() => onIgnore?.(a.id)}
                  >
                    <X className="h-3 w-3" />
                    Ignore
                  </Button>
                </div>
              ) : null}
              {a.status === "accepted" ? (
                <p className="mt-1 text-[10px] text-emerald-600">Accepted</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canAppend ? (
        <div className="space-y-2 border-t border-border pt-3">
          <label className="flex items-center gap-1 text-xs font-medium">
            <MessageSquare className="h-3.5 w-3.5" />
            Add refinement
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="e.g. Client prefers option B — updated todo"
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
          <Button
            type="button"
            size="sm"
            disabled={!draft.trim()}
            onClick={() => {
              onSubmitAppend?.(draft.trim());
              setDraft("");
            }}
          >
            Post append
          </Button>
        </div>
      ) : null}
    </div>
  );
}
