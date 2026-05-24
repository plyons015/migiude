const STORAGE_KEY = "migiude-opening-splash-date";

/** Local calendar date as YYYY-MM-DD. */
export function splashDayKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

/** Web: show opening video only on the first load of each local day. */
export function shouldShowDailyOpeningSplash(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== splashDayKey();
  } catch {
    return true;
  }
}

export function markDailyOpeningSplashShown(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, splashDayKey());
  } catch {
    /* private mode / quota */
  }
}
