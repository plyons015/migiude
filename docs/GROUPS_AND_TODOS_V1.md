# Groups, friends & todos (v1)

## Lanes

| Lane | Capture | Storage UI | Todos |
|------|---------|------------|-------|
| **Personal / local** | On-device listen, manual notes | **Notepad** (`/archive/`) | Personal todos (`!meetingId`, `!groupId`) |
| **Meetings / cloud** | Meeting room, shared workspaces | **Meetings** tab | Meeting-linked todos |

## Friends & groups

- **People** tab: friends list, group list, invite links (`/accept?token=…`).
- **Group workspaces**: shared meeting visibility for members (Firestore `groupWorkspaces`).
- Invites: create link → friend opens accept URL → joins group.

## Dashboard todo strip

- Surfaces a few open todos (personal + meeting).
- Tap row → Notepad (personal) or Meetings (meeting/group).
- Does not replace full lists in Notepad / Meetings.

## Phases (this doc)

| Phase | Scope | Status |
|-------|--------|--------|
| **A** | Meetings tab + Notepad split; personal vs meeting todos | Done |
| **B** | Friends, groups, invites | Done |
| **C** | Shared meetings in Meetings hub | Done |
| **D** | Teams bot (Pro/Power) | Coming soon (UI gated) |

## Related

See [ROADMAP.md](./ROADMAP.md) for post-meeting workspace, tags/topics, and follow-ups.
