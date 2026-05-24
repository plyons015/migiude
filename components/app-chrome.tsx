"use client";

import { AppHeader } from "@/components/app-header";
import { FreeTierBottomBar } from "@/components/plan/free-tier-bottom-bar";
import { useAuthUser } from "@/hooks/use-auth-user";
import { isAppSession } from "@/lib/firebase/session-policy";
import { usePathname } from "next/navigation";

type AppChromeProps = {
  children: React.ReactNode;
};

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const { user, loading } = useAuthUser();
  const isAdmin = pathname?.startsWith("/admin");
  const isSetup =
    pathname === "/setup" || pathname?.startsWith("/setup/");
  const isDashboard =
    pathname === "/" || pathname?.startsWith("/dashboard");
  const showHeader =
    !isAdmin &&
    !isDashboard &&
    (isSetup || (isAppSession(user) && !loading));

  return (
    <>
      {showHeader ? <AppHeader /> : null}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <FreeTierBottomBar />
    </>
  );
}
