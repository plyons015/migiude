"use client";

import { HelpHeaderButton } from "@/components/help/help-header-button";
import { LogoutHeaderButton } from "@/components/auth/logout-header-button";
import { APP_NAME } from "@/lib/branding/app-name";
import { ARCHIVE_PATH } from "@/lib/archive/routes";
import { MEETINGS_PATH } from "@/lib/meetings/routes";
import { PEOPLE_PATH } from "@/lib/people/routes";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BookText,
  Calendar,
  Home,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard/", label: "Home", icon: Home },
  { href: MEETINGS_PATH, label: "Meetings", icon: Calendar },
  { href: ARCHIVE_PATH, label: "Notepad", icon: BookText },
  { href: PEOPLE_PATH, label: "Friends", icon: Users },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    const base = href.replace(/\/$/, "");
    if (href === "/dashboard/") {
      return pathname === "/" || pathname.startsWith("/dashboard");
    }
    if (href === MEETINGS_PATH) {
      return pathname.startsWith("/meetings") || pathname.startsWith("/library");
    }
    if (href === ARCHIVE_PATH) {
      return pathname.startsWith("/archive") || pathname.startsWith("/notes");
    }
    return pathname === base || pathname.startsWith(`${base}/`);
  }

  const isDashboard =
    pathname === "/" || pathname?.startsWith("/dashboard");

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-lg items-center justify-between gap-2 px-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/"
            className="flex shrink-0 items-center"
            aria-label={`${APP_NAME} home`}
          >
            <Image
              src="/branding/logo.png"
              alt={APP_NAME}
              width={112}
              height={32}
              unoptimized
              className="h-8 w-auto max-w-28 object-contain object-left"
              style={{ width: "auto", height: "2rem" }}
              priority
            />
          </Link>
        </div>

        {!isDashboard ? (
          <div className="flex min-w-0 flex-1 justify-center gap-0.5 overflow-x-auto">
            {links.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant={isActive(href) ? "default" : "ghost"}
                size="icon"
                className="shrink-0"
                asChild
              >
                <Link href={href} aria-label={label} title={label}>
                  <Icon className="h-4 w-4" />
                </Link>
              </Button>
            ))}
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-0.5">
          <HelpHeaderButton className="shrink-0" />
          <Button
            variant={pathname.startsWith("/settings") ? "default" : "ghost"}
            size="icon"
            className="shrink-0"
            asChild
          >
            <Link
              href="/settings/"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <LogoutHeaderButton
            className="shrink-0"
            iconClassName="h-4 w-4"
          />
        </div>
      </nav>
    </header>
  );
}
