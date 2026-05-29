"use client";

import { AuthGate } from "@/components/auth-gate";
import { getBrowserPath } from "@/lib/onboarding/routes";
import { usePathname } from "next/navigation";

function isPublicAppPath(path: string): boolean {
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/setup" ||
    path.startsWith("/setup/") ||
    path === "/onboarding" ||
    path.startsWith("/onboarding/") ||
    path === "/help" ||
    path.startsWith("/help/") ||
    path === "/accept" ||
    path.startsWith("/accept/") ||
    path === "/integrations/microsoft/callback" ||
    path.startsWith("/integrations/microsoft/callback/")
  );
}

export function AppSessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path =
    pathname && pathname.length > 0 ? pathname : getBrowserPath();

  if (isPublicAppPath(path)) {
    return <>{children}</>;
  }

  return <AuthGate>{() => <>{children}</>}</AuthGate>;
}
