"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/branding/app-name";
import { knowledgeBaseArticlePath } from "@/lib/help/knowledge-base";
import Link from "next/link";

const COMPARISON_ROWS: {
  topic: string;
  ude: string;
  typical: string;
}[] = [
  {
    topic: "Quick capture default",
    ude: "On-device Whisper (WASM or native Android)",
    typical: "Cloud or browser speech",
  },
  {
    topic: "Audio leaves device",
    ude: "Only when you hold for meeting mode",
    typical: "Often by default",
  },
  {
    topic: "Speaker labels",
    ude: "Meeting mode (cloud hold)",
    typical: "Strong with meeting bots",
  },
  {
    topic: "Offline / local-only",
    ude: "Cached models + no cloud sync mode",
    typical: "Usually online-only",
  },
  {
    topic: "Vocabulary & corrections",
    ude: "Private on device (IndexedDB)",
    typical: "Varies; often account cloud",
  },
];

export function OnDeviceModesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Why on-device?</CardTitle>
        <CardDescription>
          Tap = private Whisper on your phone. Hold = meeting-grade cloud when
          you need speakers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span />
          <span>{APP_NAME}</span>
          <span>Typical cloud recorder</span>
        </div>
        <ul className="space-y-2">
          {COMPARISON_ROWS.map((row) => (
            <li
              key={row.topic}
              className="grid grid-cols-3 gap-2 border-b border-border/60 pb-2 text-xs last:border-0"
            >
              <span className="font-medium text-foreground">{row.topic}</span>
              <span className="text-muted-foreground">{row.ude}</span>
              <span className="text-muted-foreground">{row.typical}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Mic colors: <span className="text-teal-700 dark:text-teal-300">teal</span>{" "}
          = on-device ·{" "}
          <span className="text-violet-700 dark:text-violet-300">violet</span> =
          meeting / cloud.
        </p>
        <Link
          href={knowledgeBaseArticlePath("on-device-modes")}
          className="inline-block text-sm font-medium text-violet-600 underline dark:text-violet-400"
        >
          Full guide: on-device vs meeting mode →
        </Link>
      </CardContent>
    </Card>
  );
}
