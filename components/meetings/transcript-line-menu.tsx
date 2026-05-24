"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TranscriptSegment } from "@/lib/data/types";
import { ListTodo, Pencil, Star, X } from "lucide-react";
import { useEffect, useRef } from "react";

export type TranscriptLineAction = "highlight" | "todo" | "both" | "edit";

type TranscriptLineMenuProps = {
  segment: TranscriptSegment;
  onAction: (action: TranscriptLineAction, note?: string) => void;
  onClose: () => void;
};

export function TranscriptLineMenu({
  segment,
  onAction,
  onClose,
}: TranscriptLineMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const run = (action: TranscriptLineAction) => {
    const note = noteRef.current?.value.trim() || undefined;
    onAction(action, note);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="mt-2 rounded-lg border border-violet-200 bg-violet-50/90 p-3 shadow-sm dark:border-violet-900/50 dark:bg-violet-950/40"
      role="dialog"
      aria-label="Transcript line actions"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          &ldquo;{segment.text}&rdquo;
        </p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-background/60"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`line-note-${segment.id}`} className="text-xs">
          Optional note
        </Label>
        <input
          id={`line-note-${segment.id}`}
          ref={noteRef}
          type="text"
          placeholder="Add context…"
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={() => run("highlight")}
        >
          <Star className="h-3.5 w-3.5" />
          Highlight
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={() => run("todo")}
        >
          <ListTodo className="h-3.5 w-3.5" />
          Follow-up
        </Button>
        <Button
          type="button"
          size="sm"
          variant="default"
          className="gap-1.5"
          onClick={() => run("both")}
        >
          <Star className="h-3.5 w-3.5" />
          <ListTodo className="h-3.5 w-3.5" />
          Both
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => run("edit")}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit line
        </Button>
      </div>
    </div>
  );
}