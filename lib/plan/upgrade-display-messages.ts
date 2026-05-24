import type { UpgradeNudge } from "@/lib/plan/upgrade-nudges";

export type IpodDisplayTone =
  | "neutral"
  | "violet"
  | "amber"
  | "emerald"
  | "ad";

export type IpodDisplayContent = {
  id: string;
  tone: IpodDisplayTone;
  line1: string;
  line2?: string;
  linkHref?: string;
  linkLabel?: string;
  dismissible?: boolean;
  /** Auto-hide after ms (ads) */
  autoHideMs?: number;
};

const PRO_BENEFITS: Omit<IpodDisplayContent, "id">[] = [
  {
    tone: "violet",
    line1: "Pro · 1,000 cloud minutes",
    line2: "Speaker labels & better accuracy in noisy rooms.",
    linkHref: "/settings/",
    linkLabel: "View Pro",
  },
  {
    tone: "violet",
    line1: "Pro · 200 AI actions",
    line2: "Summaries, daily recap, and mind maps without counting every tap.",
    linkHref: "/settings/",
    linkLabel: "View Pro",
  },
  {
    tone: "emerald",
    line1: "Pro · cloud backup",
    line2: "Sync notes & meetings to your account (coming soon).",
    linkHref: "/settings/",
    linkLabel: "Learn more",
  },
];

export function pickRotatingBenefit(
  index: number,
): Omit<IpodDisplayContent, "id"> {
  return PRO_BENEFITS[index % PRO_BENEFITS.length]!;
}

export function nudgeToIpodContent(nudge: Extract<UpgradeNudge, { show: true }>): IpodDisplayContent {
  return {
    id: `nudge-${nudge.resource}-${nudge.severity}`,
    tone: nudge.severity === "limit" ? "amber" : "violet",
    line1: nudge.message,
    linkHref: "/settings/",
    linkLabel: "View Pro",
    dismissible: nudge.severity === "approaching",
  };
}

export function toneClasses(tone: IpodDisplayTone): {
  shell: string;
  text: string;
  sub: string;
} {
  switch (tone) {
    case "violet":
      return {
        shell:
          "bg-gradient-to-b from-violet-100 to-violet-200/80 dark:from-violet-950 dark:to-violet-900/60",
        text: "text-violet-950 dark:text-violet-50",
        sub: "text-violet-800/80 dark:text-violet-200/80",
      };
    case "amber":
      return {
        shell:
          "bg-gradient-to-b from-amber-100 to-amber-200/80 dark:from-amber-950 dark:to-amber-900/60",
        text: "text-amber-950 dark:text-amber-50",
        sub: "text-amber-900/80 dark:text-amber-100/80",
      };
    case "emerald":
      return {
        shell:
          "bg-gradient-to-b from-emerald-100 to-emerald-200/80 dark:from-emerald-950 dark:to-emerald-900/60",
        text: "text-emerald-950 dark:text-emerald-50",
        sub: "text-emerald-900/80 dark:text-emerald-100/80",
      };
    case "ad":
      return {
        shell:
          "bg-gradient-to-b from-zinc-200 to-zinc-300/80 dark:from-zinc-900 dark:to-zinc-800/80",
        text: "text-zinc-900 dark:text-zinc-100",
        sub: "text-zinc-700 dark:text-zinc-300",
      };
    default:
      return {
        shell:
          "bg-gradient-to-b from-zinc-100 to-zinc-200/90 dark:from-zinc-900 dark:to-zinc-950",
        text: "text-zinc-900 dark:text-zinc-50",
        sub: "text-zinc-600 dark:text-zinc-400",
      };
  }
}
