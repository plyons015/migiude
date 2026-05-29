"use client";

import { ModalPortal } from "@/components/ui/modal-portal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createFriendInvite,
  friendInviteShareText,
} from "@/lib/collaboration/friend-invites";
import { copyToClipboard } from "@/lib/clipboard";
import { Loader2, Mail, Share2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type FriendInviteDialogProps = {
  open: boolean;
  inviterUid: string;
  email: string;
  friendDisplayName?: string;
  onClose: () => void;
  onSent?: () => void;
};

export function FriendInviteDialog({
  open,
  inviterUid,
  email,
  friendDisplayName,
  onClose,
  onSent,
}: FriendInviteDialogProps) {
  const [personalMessage, setPersonalMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [shareText, setShareText] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPersonalMessage("");
    setError(null);
    setLink(null);
    setShareText(null);
    setCopyMsg(null);
  }, [open, email]);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCopyMsg(null);
    try {
      const trimmedName = friendDisplayName?.trim();
      const trimmedNote = personalMessage.trim();
      const { link: inviteLink } = await createFriendInvite({
        inviterUid,
        targetEmail: email,
        ...(trimmedName ? { friendDisplayName: trimmedName } : {}),
        ...(trimmedNote ? { personalMessage: trimmedNote } : {}),
      });
      const text = friendInviteShareText({
        personalMessage: personalMessage.trim() || undefined,
        link: inviteLink,
      });
      setLink(inviteLink);
      setShareText(text);
      onSent?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create invite.");
    } finally {
      setBusy(false);
    }
  }, [email, friendDisplayName, inviterUid, onSent, personalMessage]);

  const shareNative = useCallback(async () => {
    if (!shareText) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: shareText, title: "Join me on Ude" });
        return;
      } catch {
        /* user cancelled or unsupported */
      }
    }
    const ok = await copyToClipboard(shareText);
    setCopyMsg(ok ? "Copied invite text." : "Could not copy.");
  }, [shareText]);

  const shareEmail = useCallback(() => {
    if (!shareText) return;
    const subject = encodeURIComponent("Join me on Ude");
    const body = encodeURIComponent(shareText);
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  }, [email, shareText]);

  if (!open) return null;

  return (
    <ModalPortal active={open}>
      <div
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-invite-title"
        onClick={onClose}
      >
        <div
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 id="friend-invite-title" className="text-base font-semibold">
                Share friend invite
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Invite {friendDisplayName?.trim() || email} to connect on Ude. They
                will appear on your friends list after they sign in and accept.
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

          <div className="mt-4 space-y-3">
            <div>
              <Label className="text-xs">Email</Label>
              <p className="mt-1 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-sm">
                {email}
              </p>
            </div>

            <div>
              <Label htmlFor="friend-invite-note" className="text-xs">
                Personal note (optional, 50 characters)
              </Label>
              <input
                id="friend-invite-note"
                value={personalMessage}
                maxLength={50}
                disabled={busy || Boolean(link)}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="See you on Ude!"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {personalMessage.length}/50
              </p>
            </div>

            {!link ? (
              <Button
                type="button"
                className="w-full"
                disabled={busy}
                onClick={() => void generate()}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Create invite link
              </Button>
            ) : (
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Message preview
                </p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed">
                  {shareText}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void copyToClipboard(shareText ?? "").then((ok) =>
                        setCopyMsg(ok ? "Copied." : "Copy failed."),
                      );
                    }}
                  >
                    Copy text
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void shareNative()}
                  >
                    <Share2 className="mr-1 h-3.5 w-3.5" />
                    Share
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={shareEmail}
                  >
                    <Mail className="mr-1 h-3.5 w-3.5" />
                    Email
                  </Button>
                </div>
              </div>
            )}

            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
            {copyMsg ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {copyMsg}
              </p>
            ) : null}

            {link ? (
              <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
                Done
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
