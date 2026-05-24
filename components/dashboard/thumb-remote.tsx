"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Library } from "lucide-react";
import { cn } from "@/lib/utils";

const REMOTE_LINKS = [
  { href: "/notes/", label: "Notes", icon: FileText },
  { href: "/library/", label: "Library", icon: Library },
] as const;

export function ThumbRemote() {
  const pathname = usePathname();

  function active(href: string): boolean {
    const base = href.replace(/\/$/, "");
    return pathname === base || pathname.startsWith(`${base}/`);
  }

  return (
    <nav
      className="flex items-center justify-center gap-8"
      aria-label="Quick navigation"
    >
      {REMOTE_LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch={false}
          className="group flex flex-col items-center gap-1"
          aria-label={label}
          aria-current={active(href) ? "page" : undefined}
        >
          <span
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-sm transition-all duration-200 active:scale-95",
              active(href)
                ? "border-violet-500 bg-violet-600 text-white shadow-violet-500/30"
                : "border-zinc-300 bg-background text-zinc-700 group-hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-200",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            {label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
