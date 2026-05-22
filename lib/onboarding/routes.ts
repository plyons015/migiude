/** Pathname for static export + Capacitor (avoids stale usePathname during hydration). */
export function getBrowserPath(): string {
  if (typeof window === "undefined") return "/";
  let path = window.location.pathname;
  if (path.endsWith("/index.html")) {
    path = path.slice(0, -"/index.html".length) || "/";
  }
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return path || "/";
}

export function isOnboardingRoute(path = getBrowserPath()): boolean {
  return (
    path === "/onboarding" ||
    path === "/setup" ||
    path.startsWith("/onboarding/") ||
    path.startsWith("/setup/")
  );
}
