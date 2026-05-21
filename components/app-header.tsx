"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Library, Mic, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard/", label: "Home", icon: LayoutDashboard },
  { href: "/listen/", label: "Listen", icon: Mic },
  { href: "/notes/", label: "Notes", icon: FileText },
  { href: "/library/", label: "Library", icon: Library },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    const base = href.replace(/\/$/, "");
    if (href === "/dashboard/") {
      return pathname === "/" || pathname.startsWith("/dashboard");
    }
    if (href === "/library/") {
      return pathname.startsWith("/library");
    }
    return pathname === base || pathname.startsWith(`${base}/`);
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-lg items-center gap-1 px-3">
        <span className="mr-1 shrink-0 text-sm font-semibold">Migiude</span>
        <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
          {links.map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              variant={isActive(href) ? "default" : "ghost"}
              size="sm"
              className="shrink-0 gap-1.5"
              asChild
            >
              <Link href={href}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            </Button>
          ))}
        </div>
        <Button
          variant={pathname.startsWith("/settings") ? "default" : "ghost"}
          size="icon"
          className="shrink-0"
          asChild
        >
          <Link href="/settings/" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </nav>
    </header>
  );
}
