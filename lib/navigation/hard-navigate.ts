/** Full-page navigation — avoids App Router RSC fetches (static export / Capacitor). */
export function hardReplace(path: string): void {
  if (typeof window === "undefined") return;
  window.location.replace(path);
}
