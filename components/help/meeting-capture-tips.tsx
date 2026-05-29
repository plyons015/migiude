"use client";

import { knowledgeBaseArticlePath } from "@/lib/help/knowledge-base";
import { TEAMS_BOT_INTEGRATION_LAUNCHED } from "@/lib/integrations/microsoft/feature";
import Link from "next/link";
import { Headphones, Video } from "lucide-react";

type MeetingCaptureTipsProps = {
  transcriptionMode: "browser" | "cloud";
  localOnly: boolean;
  className?: string;
};

export function MeetingCaptureTips({
  transcriptionMode,
  localOnly,
  className,
}: MeetingCaptureTipsProps) {
  const useCloud = !localOnly && transcriptionMode === "cloud";

  return (
    <div
      className={
        className ??
        "rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100"
      }
    >
      <p className="flex items-center gap-1.5 font-semibold">
        <Video className="h-3.5 w-3.5 shrink-0" />
        Teams / Zoom / Meet
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed opacity-90">
        {useCloud ? (
          <li>Cloud STT is on — speaker labels work best with clear turns.</li>
        ) : (
          <li>
            For speaker labels, use{" "}
            <Link href="/settings/" className="font-medium underline">
              Settings → Cloud STT — speakers
            </Link>{" "}
            for meetings.
          </li>
        )}
        <li className="flex items-start gap-1">
          <Headphones className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Headphones reduce echo; your mic may capture mostly you — see the
            guide for full-call capture.
          </span>
        </li>
        <li>Mixed English accents: pick US or UK in Settings; rename speakers after.</li>
      </ul>
      {TEAMS_BOT_INTEGRATION_LAUNCHED ? (
        <p className="mt-2 text-[11px] opacity-90">
          On Pro or Power, send a disclosed Teams bot from{" "}
          <Link href="/settings/#teams-bot" className="font-medium underline">
            Settings → Teams bot
          </Link>{" "}
          for full-call audio (Otter-style).
        </p>
      ) : (
        <p className="mt-2 text-[11px] opacity-90">
          Teams meeting bot (Otter-style) is coming soon on Pro and Power. Use
          the guide below for mic capture today.
        </p>
      )}
      <Link
        href={knowledgeBaseArticlePath("teams-zoom-meet")}
        className="mt-2 inline-block font-medium text-sky-800 underline dark:text-sky-200"
      >
        Full guide: optimize video calls
      </Link>
    </div>
  );
}
