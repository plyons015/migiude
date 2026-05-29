"use client";

import { FriendInviteDialog } from "@/components/people/friend-invite-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useGroups } from "@/hooks/use-groups";
import { useFriends } from "@/hooks/use-friends";
import { removeFriend } from "@/lib/data/friends-store";
import { saveGroup, removeGroup } from "@/lib/data/groups-store";
import type { GroupRecord } from "@/lib/groups/types";
import { type PeopleTab, peopleUrl } from "@/lib/people/routes";
import { createGroupInvite } from "@/lib/collaboration/group-invites";
import { isLocalOnlyMode } from "@/lib/settings/preferences";
import { Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PeopleViewProps = {
  userId: string;
};

function parseTab(raw: string | null): PeopleTab {
  return raw === "groups" ? "groups" : "friends";
}

export function PeopleView({ userId }: PeopleViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthUser();

  const tab = parseTab(searchParams.get("tab"));
  const groupIdParam = searchParams.get("group") ?? undefined;

  const { friends, error: friendsError } = useFriends(userId);
  const { groups } = useGroups(userId);
  const localOnly = isLocalOnlyMode();

  const selectedGroup = useMemo(() => {
    if (tab !== "groups") return null;
    if (groupIdParam) return groups.find((g) => g.id === groupIdParam) ?? null;
    return groups[0] ?? null;
  }, [tab, groupIdParam, groups]);

  // Keep URL group param stable once user enters Groups tab.
  useEffect(() => {
    if (tab !== "groups") return;
    if (!groups.length) return;
    if (groupIdParam) return;
    const next = peopleUrl({ tab: "groups", group: groups[0].id });
    router.replace(next);
  }, [groups, groupIdParam, router, tab]);

  const [friendEmail, setFriendEmail] = useState("");
  const [friendDisplayName, setFriendDisplayName] = useState("");
  const [friendBusy, setFriendBusy] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingInviteEmail, setPendingInviteEmail] = useState("");
  const [pendingInviteName, setPendingInviteName] = useState("");

  const [groupDraft, setGroupDraft] = useState<{
    id?: string;
    name: string;
    friendIds: string[];
    memberUidsText?: string;
  } | null>(null);
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "groups") return;
    setGroupError(null);
    if (!selectedGroup) {
      setGroupDraft(null);
      return;
    }
    setGroupDraft({
      id: selectedGroup.id,
      name: selectedGroup.name,
      friendIds: selectedGroup.friendIds,
      memberUidsText: (selectedGroup.memberUids ?? []).join("\n"),
    });
  }, [selectedGroup, tab]);

  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUid, setInviteUid] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const copyInvite = useCallback(async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  async function handleGenerateUidInvite() {
    if (!selectedGroup) return;
    if (inviteBusy) return;
    setInviteError(null);
    setInviteLink(null);

    const targetUid = inviteUid.trim();
    if (!targetUid) {
      setInviteError("Enter a target UID.");
      return;
    }

    setInviteBusy(true);
    try {
      const { token } = await createGroupInvite({
        ownerUid: userId,
        groupId: selectedGroup.id,
        mode: "uid",
        targetUid,
      });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      setInviteLink(`${origin}/accept/?token=${encodeURIComponent(token)}`);
      setInviteUid("");
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Could not create invite.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleGenerateEmailInvite() {
    if (!selectedGroup) return;
    if (inviteBusy) return;
    setInviteError(null);
    setInviteLink(null);

    const targetEmail = inviteEmail.trim().toLowerCase();
    if (!targetEmail.includes("@")) {
      setInviteError("Enter a valid email address.");
      return;
    }

    setInviteBusy(true);
    try {
      const { token } = await createGroupInvite({
        ownerUid: userId,
        groupId: selectedGroup.id,
        mode: "email",
        targetEmail,
      });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      setInviteLink(`${origin}/accept/?token=${encodeURIComponent(token)}`);
      setInviteEmail("");
    } catch (e) {
      setInviteError(
        e instanceof Error ? e.message : "Could not create email invite.",
      );
    } finally {
      setInviteBusy(false);
    }
  }

  function setTab(nextTab: PeopleTab) {
    router.replace(peopleUrl({ tab: nextTab }));
  }

  function handlePrepareFriendInvite() {
    if (friendBusy) return;
    setFriendError(null);

    const email = friendEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setFriendError("Enter a valid email address.");
      return;
    }

    if (friends.some((f) => f.email.toLowerCase() === email)) {
      setFriendError("This person is already on your friends list.");
      return;
    }

    const selfEmail = user?.email?.trim().toLowerCase();
    if (selfEmail && selfEmail === email) {
      setFriendError("You can't invite yourself.");
      return;
    }

    setPendingInviteEmail(email);
    setPendingInviteName(friendDisplayName.trim());
    setInviteOpen(true);
  }

  function closeInviteDialog() {
    setInviteOpen(false);
    setFriendEmail("");
    setFriendDisplayName("");
  }

  async function handleDeleteFriend(friendId: string) {
    if (groupBusy) return;
    setFriendError(null);
    setGroupError(null);
    setFriendBusy(true);
    try {
      await removeFriend(userId, friendId);
    } finally {
      setFriendBusy(false);
    }
  }

  async function handleSaveGroup() {
    if (!groupDraft || groupBusy) return;
    const name = groupDraft.name.trim();
    if (!name) {
      setGroupError("Group name is required.");
      return;
    }
    setGroupError(null);
    setGroupBusy(true);
    try {
      await saveGroup(userId, {
        id: groupDraft.id,
        name,
        friendIds: groupDraft.friendIds,
        memberUids: (groupDraft.memberUidsText ?? "")
          .split(/[\s,]+/g)
          .map((s) => s.trim())
          .filter(Boolean),
      });
    } catch (e) {
      setGroupError(e instanceof Error ? e.message : "Could not save group.");
    } finally {
      setGroupBusy(false);
    }
  }

  async function handleCreateGroup() {
    if (groupBusy) return;
    setGroupError(null);
    setGroupBusy(true);
    try {
      // Create a new empty group; group selection will update once subscriptions refresh.
      const created = await saveGroup(userId, {
        name: "New group",
        friendIds: [],
        memberUids: [],
      });
      router.replace(peopleUrl({ tab: "groups", group: created.id }));
    } finally {
      setGroupBusy(false);
    }
  }

  async function handleDeleteGroup(group: GroupRecord) {
    setGroupError(null);
    setGroupBusy(true);
    try {
      await removeGroup(userId, group.id);
      router.replace(peopleUrl({ tab: "groups" }));
    } catch (e) {
      setGroupError(e instanceof Error ? e.message : "Could not delete group.");
    } finally {
      setGroupBusy(false);
    }
  }

  function toggleFriend(friendId: string) {
    setGroupDraft((d) => {
      if (!d) return d;
      const exists = d.friendIds.includes(friendId);
      const next = exists ? d.friendIds.filter((id) => id !== friendId) : [...d.friendIds, friendId];
      return { ...d, friendIds: next };
    });
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-violet-600" />
              Friends & Groups
            </h1>
            <p className="text-xs text-muted-foreground">
              v1: invite by email link; they appear after accepting on Ude.
            </p>
            {localOnly ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Invites require cloud sync. Turn off local-only mode in Settings.
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={tab === "friends" ? "default" : "outline"}
              onClick={() => setTab("friends")}
            >
              Friends
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "groups" ? "default" : "outline"}
              onClick={() => setTab("groups")}
            >
              Groups
            </Button>
          </div>
        </div>
      </div>

      {tab === "friends" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row">
          <div className="w-full lg:w-72">
            <div className="rounded-xl border border-border p-3">
              <Label className="text-xs">Invite friend</Label>
              <div className="mt-2 space-y-2">
                <input
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  disabled={friendBusy}
                />
                <input
                  value={friendDisplayName}
                  onChange={(e) => setFriendDisplayName(e.target.value)}
                  placeholder="Display name (optional)"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  disabled={friendBusy}
                />
                {friendError ? (
                  <p className="text-xs text-destructive">{friendError}</p>
                ) : null}
                <Button
                  type="button"
                  className="w-full"
                  disabled={friendBusy || localOnly}
                  onClick={handlePrepareFriendInvite}
                >
                  Share invite
                </Button>
              </div>
            </div>
          </div>

            <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Friends</p>
              <p className="text-xs text-muted-foreground">{friends.length} total</p>
            </div>
            {friendsError ? (
              <p className="mt-2 text-xs text-destructive">{friendsError}</p>
            ) : null}
            <div className="mt-3 flex-1 overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No friends yet. Invite someone by email.
                </p>
              ) : (
                <ul className="space-y-2">
                  {friends.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {f.displayName || f.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {f.email}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={friendBusy}
                        aria-label={`Remove ${f.email}`}
                        onClick={() => void handleDeleteFriend(f.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row">
          <div className="w-full lg:w-72">
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Groups</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={groupBusy}
                  onClick={() => void handleCreateGroup()}
                >
                  + New
                </Button>
              </div>
              <div className="mt-3 space-y-2 max-h-[50vh] overflow-y-auto">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No groups yet. Create your first group.
                  </p>
                ) : (
                  groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        router.replace(peopleUrl({ tab: "groups", group: g.id }));
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left ${
                        selectedGroup?.id === g.id
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40"
                          : "border-border bg-background hover:bg-accent"
                      }`}
                    >
                      <p className="truncate text-sm font-medium">{g.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {g.friendIds.length} member{g.friendIds.length === 1 ? "" : "s"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {selectedGroup ? "Edit group" : "Create a group"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Assign friends so you can share meetings by group later.
                </p>
              </div>
              {selectedGroup ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={groupBusy}
                  onClick={() => void handleDeleteGroup(selectedGroup)}
                >
                  Delete
                </Button>
              ) : null}
            </div>

            {!selectedGroup || !groupDraft ? (
              <div className="mt-4 text-sm text-muted-foreground">
                No group selected.
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <div>
                    <Label className="text-xs">Group name</Label>
                    <input
                      value={groupDraft.name}
                      onChange={(e) =>
                        setGroupDraft((d) =>
                          d ? { ...d, name: e.target.value } : d,
                        )
                      }
                      className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                      disabled={groupBusy}
                    />
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Members
                    </p>
                    <div className="mt-2 max-h-[32vh] overflow-y-auto space-y-2">
                      {friends.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Add friends first to assign them to this group.
                        </p>
                      ) : (
                        friends.map((f) => {
                          const checked = groupDraft.friendIds.includes(f.id);
                          return (
                            <label
                              key={f.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFriend(f.id)}
                                disabled={groupBusy}
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {f.displayName || f.email}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    {groupError ? (
                      <p className="text-xs text-destructive">{groupError}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={groupBusy}
                        onClick={() => void handleSaveGroup()}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={groupBusy}
                        onClick={() => {
                          if (!selectedGroup) return;
                          setGroupDraft({
                            id: selectedGroup.id,
                            name: selectedGroup.name,
                            friendIds: selectedGroup.friendIds,
                            memberUidsText: (selectedGroup.memberUids ?? []).join(
                              "\n",
                            ),
                          });
                          setGroupError(null);
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Group members (UIDs)
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Temporary v1: paste member user IDs (one per line). This is
                    what enables real shared meetings in the Shared tab.
                  </p>
                  <textarea
                    value={groupDraft.memberUidsText ?? ""}
                    onChange={(e) =>
                      setGroupDraft((d) =>
                        d ? { ...d, memberUidsText: e.target.value } : d,
                      )
                    }
                    rows={4}
                    className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    placeholder="uid_abc123\nuid_def456"
                    disabled={groupBusy}
                  />
                </div>

                <div className="mt-4 rounded-lg border border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Invite links
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Generate a one-time link. The recipient opens it and is
                    added to this group workspace (no user search).
                  </p>

                  <div className="mt-3 space-y-2">
                    <Label className="text-[11px]">UID invite</Label>
                    <div className="flex items-center gap-2">
                      <input
                        value={inviteUid}
                        onChange={(e) => setInviteUid(e.target.value)}
                        placeholder="uid_abc123"
                        className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        disabled={inviteBusy || groupBusy}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          inviteBusy ||
                          groupBusy ||
                          localOnly ||
                          !inviteUid.trim() ||
                          !selectedGroup
                        }
                        onClick={() => void handleGenerateUidInvite()}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <Label className="text-[11px]">Email invite</Label>
                    <div className="flex items-center gap-2">
                      <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="friend@example.com"
                        className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        disabled={inviteBusy || groupBusy}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          inviteBusy ||
                          groupBusy ||
                          localOnly ||
                          !inviteEmail.trim() ||
                          !selectedGroup
                        }
                        onClick={() => void handleGenerateEmailInvite()}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  {inviteError ? (
                    <p className="mt-2 text-xs text-destructive">{inviteError}</p>
                  ) : null}

                  {inviteLink ? (
                    <div className="mt-3 rounded-lg border border-border bg-muted/20 p-2">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Invite link
                      </p>
                      <p className="mt-1 break-all text-xs text-foreground">
                        {inviteLink}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void copyInvite(inviteLink)}
                        >
                          Copy
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(inviteLink, "_blank")}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-sky-300 bg-sky-50/40 p-3 text-sm dark:border-sky-800 dark:bg-sky-950/20">
                  <p className="font-medium text-sky-900 dark:text-sky-100">
                    Shared meetings (v1)
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add member UIDs or send invite links above. Members see shared
                    meetings under Meetings → Shared.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <FriendInviteDialog
        open={inviteOpen}
        inviterUid={userId}
        email={pendingInviteEmail}
        friendDisplayName={pendingInviteName || undefined}
        onClose={closeInviteDialog}
      />
    </main>
  );
}

