"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  CloudSyncMeta,
  CollaboratorPermission,
  SharedWithEntry,
} from "@/lib/collaboration/types";
import {
  CLOUD_SHARE_ACK_BODY,
  CLOUD_SHARE_ACK_CHECKBOX,
  CLOUD_SHARE_ACK_CONFIRM,
  CLOUD_SHARE_ACK_TITLE,
} from "@/lib/collaboration/cloud-share-copy";
import { AlertTriangle, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

type ShareModalProps = {
  open: boolean;
  title: string;
  cloudMeta: CloudSyncMeta;
  groups?: { id: string; name: string }[];
  selectedGroupId?: string | null;
  onClose: () => void;
  onShareToCloud: () => void;
  onShareToGroup?: (groupId: string) => void;
  onAddCollaborator: (entry: SharedWithEntry) => void;
  onSetPermission: (uid: string, permission: CollaboratorPermission) => void;
  onRemoveCollaborator: (uid: string) => void;
};

const PERMISSIONS: { value: CollaboratorPermission; label: string }[] = [
  { value: "view", label: "View only" },
  { value: "view_append", label: "View + append" },
  { value: "edit", label: "Edit (future)" },
];

/**
 * Placeholder UI for friend-list search + invites.
 * Wire to Firebase Function + Firestore `sharedWith` when workspace ships.
 */
export function ShareModal({
  open,
  title,
  cloudMeta,
  groups = [],
  selectedGroupId,
  onClose,
  onShareToCloud,
  onShareToGroup,
  onAddCollaborator,
  onSetPermission,
  onRemoveCollaborator,
}: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [cloudAckStep, setCloudAckStep] = useState(false);
  const [cloudAckChecked, setCloudAckChecked] = useState(false);
  const [pickedGroupId, setPickedGroupId] = useState("");

  useEffect(() => {
    if (!open) {
      setCloudAckStep(false);
      setCloudAckChecked(false);
      setEmail("");
      setPickedGroupId("");
    }
  }, [open]);

  if (!open) return null;

  function confirmShareToCloud() {
    if (!cloudAckChecked) return;
    onShareToCloud();
    setCloudAckStep(false);
    setCloudAckChecked(false);
  }

  const addByEmail = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) return;
    onAddCollaborator({
      uid: `pending_${trimmed}`,
      email: trimmed,
      permission: "view_append",
    });
    setEmail("");
  };

  const effectiveGroupId =
    pickedGroupId || selectedGroupId || cloudMeta.sharedWithGroups?.[0]?.groupId || "";

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 id="share-modal-title" className="text-base font-semibold">
              Share workspace
            </h2>
            <p className="text-xs text-muted-foreground">{title}</p>
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

        {!cloudMeta.isCloud ? (
          <div className="mb-4 rounded-lg border border-dashed border-violet-300 bg-violet-50/50 p-3 text-sm dark:border-violet-800 dark:bg-violet-950/30">
            {cloudAckStep ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">{CLOUD_SHARE_ACK_TITLE}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {CLOUD_SHARE_ACK_BODY}
                    </p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={cloudAckChecked}
                    onChange={(e) => setCloudAckChecked(e.target.checked)}
                  />
                  {CLOUD_SHARE_ACK_CHECKBOX}
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={!cloudAckChecked}
                    onClick={confirmShareToCloud}
                  >
                    {CLOUD_SHARE_ACK_CONFIRM}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCloudAckStep(false);
                      setCloudAckChecked(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p>
                  Push this workspace to the cloud so collaborators can view it
                  and add refinements. Local-only content stays on device until
                  you share.
                </p>
                <Button
                  type="button"
                  className="mt-3 w-full"
                  onClick={() => setCloudAckStep(true)}
                >
                  Share to cloud…
                </Button>
              </>
            )}
          </div>
        ) : (
          <p className="mb-3 text-xs text-emerald-700 dark:text-emerald-300">
            On cloud — collaborators can open read-only transcript + append
            section.
          </p>
        )}

        <div className="mb-4 rounded-lg border border-dashed border-sky-300 bg-sky-50/40 p-3 text-sm dark:border-sky-800 dark:bg-sky-950/20">
          <p className="font-medium text-sky-900 dark:text-sky-100">
            Share with group
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Groups are synced to your account now. True cross-user sharing ships
            next, but you can attach a group to this workspace today.
          </p>
          {groups.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Create a group first in Friends → Groups.
            </p>
          ) : (
            <div className="mt-2 flex gap-2">
              <select
                value={effectiveGroupId}
                onChange={(e) => setPickedGroupId(e.target.value)}
                className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-sm"
                disabled={!cloudMeta.isCloud}
                aria-label="Group"
              >
                <option value="">Choose group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={!cloudMeta.isCloud || !effectiveGroupId || !onShareToGroup}
                onClick={() => onShareToGroup?.(effectiveGroupId)}
              >
                Apply
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-xs">Add collaborator</Label>
          <p className="text-[11px] text-muted-foreground">
            Friend list search will replace manual email entry.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              disabled={!cloudMeta.isCloud}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!cloudMeta.isCloud}
              onClick={addByEmail}
            >
              <Users className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        {cloudMeta.sharedWith.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {cloudMeta.sharedWith.map((entry) => (
              <li
                key={entry.uid}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {entry.displayName ?? entry.email ?? entry.uid}
                </span>
                <select
                  value={entry.permission}
                  onChange={(e) =>
                    onSetPermission(
                      entry.uid,
                      e.target.value as CollaboratorPermission,
                    )
                  }
                  className="rounded border border-border bg-background px-1 py-0.5 text-xs"
                  aria-label="Permission"
                >
                  {PERMISSIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() => onRemoveCollaborator(entry.uid)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-4 text-[11px] text-muted-foreground">
          Unlink and “return to local” will duplicate for the recipient when
          collaboration is enabled. Owner remains final arbiter on conflicts.
        </p>
      </div>
    </div>
  );
}
