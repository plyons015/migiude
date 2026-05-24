"use client";

import { HelpHeaderButton } from "@/components/help/help-header-button";
import { LogoutHeaderButton } from "@/components/auth/logout-header-button";
import { APP_NAME } from "@/lib/branding/app-name";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Library, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard/", label: "Home", icon: LayoutDashboard },
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

  const isDashboard =
    pathname === "/" || pathname?.startsWith("/dashboard");

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-lg items-center gap-1 px-3">
        <Link
          href="/dashboard/"
          className="mr-2 flex shrink-0 items-center"
          aria-label={`${APP_NAME} home`}
        >
          <Image
            src="/branding/logo.png"
            alt={APP_NAME}
            width={112}
            height={32}
            unoptimized
            className="h-8 w-auto max-w-28 object-contain object-left"
            priority
          />
        </Link>
        {!isDashboard ? (
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
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <HelpHeaderButton />
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
          <LogoutHeaderButton iconClassName="h-4 w-4" />
        </div>
      </nav>
    </header>
  );
}
