"use client";

import { DailyRecapCard } from "@/components/dashboard/daily-recap-card";
import { TodoList } from "@/components/todos/todo-list";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMeetings } from "@/hooks/use-meetings";
import { useNotes } from "@/hooks/use-notes";
import { useTodos } from "@/hooks/use-todos";
import { format } from "date-fns";
import { Calendar, FileText, ListTodo, Mic, Plus } from "lucide-react";
import Link from "next/link";

type DashboardViewProps = {
  userId: string;
};

export function DashboardView({ userId }: DashboardViewProps) {
  const { notes } = useNotes(userId);
  const { meetings } = useMeetings(userId);
  const { openTodos, dueSoon } = useTodos(userId);
  const recentNotes = notes.slice(0, 3);
  const recentMeetings = meetings.slice(0, 5);

  const quickActions = [
    { href: "/listen/", label: "Listen", icon: Mic, desc: "Voice → text" },
    { href: "/notes/", label: "New note", icon: Plus, desc: "Write or paste" },
    {
      href: "/notes/",
      label: "All notes",
      icon: FileText,
      desc: `${notes.length} saved`,
    },
    {
      href: "/notes/?tab=todos",
      label: "Todos",
      icon: ListTodo,
      desc: `${openTodos.length} open`,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Quick actions and recents</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {quickActions.map(({ href, label, icon: Icon, desc }) => (
          <Link key={label} href={href}>
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardHeader className="p-4 pb-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <CardDescription>{desc}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <DailyRecapCard userId={userId} />

      <Link href="/library/">
        <Card className="transition-colors hover:bg-accent/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Library</CardTitle>
            <CardDescription>
              Filter by tag or topic, series follow-ups, export Markdown
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      {openTodos.length > 0 ? (
        <Link href="/notes/?tab=todos">
          <Card className="border-emerald-200/80 transition-colors hover:bg-accent/50 dark:border-emerald-900/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Open follow-ups</CardTitle>
                <Badge variant="secondary">{openTodos.length}</Badge>
              </div>
              <CardDescription>
                Action items from meetings and AI — tap to review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TodoList userId={userId} todos={openTodos.slice(0, 5)} compact />
            </CardContent>
          </Card>
        </Link>
      ) : null}

      {recentMeetings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent meetings</CardTitle>
            <CardDescription>Meeting room — transcript, appends, follow-ups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentMeetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings/?id=${m.id}`}
                className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(m.startedAt, "MMM d, HH:mm")}
                    {m.aiSummary ? " · summarized" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {dueSoon.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Due soon</CardTitle>
            <Badge variant="secondary">{dueSoon.length}</Badge>
          </CardHeader>
          <CardContent>
            <TodoList userId={userId} todos={dueSoon} compact />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notes yet. Save a transcript from Listen mode.
            </p>
          ) : (
            recentNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/?id=${note.id}`}
                className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <p className="font-medium">{note.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {note.body}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {format(note.updatedAt, "MMM d, yyyy")}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
