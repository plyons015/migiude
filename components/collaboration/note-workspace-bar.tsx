"use client";

import { Button } from "@/components/ui/button";
import { ShareModal } from "@/components/collaboration/share-modal";
import {
  type CloudSyncMeta,
  type SharedWithEntry,
} from "@/lib/collaboration/types";
import { formatSyncStatus } from "@/lib/collaboration/placeholders";
import { Cloud, Share2 } from "lucide-react";
import { useState } from "react";

type NoteWorkspaceBarProps = {
  userId: string;
  noteId?: string;
  noteTitle: string;
  cloudMeta: CloudSyncMeta;
  groups?: { id: string; name: string }[];
  selectedGroupId?: string | null;
  onShareToGroup?: (groupId: string) => void;
  onCloudMetaChange?: (meta: CloudSyncMeta) => void;
};

/** Placeholder share controls for notes (same tab as meeting workspace). */
export function NoteWorkspaceBar({
  noteId,
  noteTitle,
  cloudMeta,
  groups,
  selectedGroupId,
  onShareToGroup,
  onCloudMetaChange,
}: NoteWorkspaceBarProps) {
  const [shareOpen, setShareOpen] = useState(false);

  const canShare = Boolean(onCloudMetaChange && noteId);

  return (
    <>
      <ShareModal
        open={shareOpen}
        title={noteTitle}
        cloudMeta={cloudMeta}
        groups={groups}
        selectedGroupId={selectedGroupId}
        onClose={() => setShareOpen(false)}
        onShareToCloud={() =>
          onCloudMetaChange?.({
            ...cloudMeta,
            isCloud: true,
            lastSyncedAt: Date.now(),
          })
        }
        onShareToGroup={onShareToGroup}
        onAddCollaborator={(entry: SharedWithEntry) =>
          onCloudMetaChange?.({
            ...cloudMeta,
            sharedWith: [...cloudMeta.sharedWith, entry],
          })
        }
        onSetPermission={(uid, permission) =>
          onCloudMetaChange?.({
            ...cloudMeta,
            sharedWith: cloudMeta.sharedWith.map((e) =>
              e.uid === uid ? { ...e, permission } : e,
            ),
          })
        }
        onRemoveCollaborator={(uid) =>
          onCloudMetaChange?.({
            ...cloudMeta,
            sharedWith: cloudMeta.sharedWith.filter((e) => e.uid !== uid),
          })
        }
      />
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Cloud className="h-3 w-3" />
          {formatSyncStatus(cloudMeta)}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto h-7 gap-1 text-xs"
          disabled={!canShare}
          onClick={() => setShareOpen(true)}
        >
          <Share2 className="h-3 w-3" />
          Share to cloud…
        </Button>
      </div>
    </>
  );
}
