import { isNativePlatform } from "@/lib/capacitor/platform";
import { hardReplace } from "@/lib/navigation/hard-navigate";

/** App home: `/` in dev and static hosting; `/dashboard/` remains a valid alias. */
export const APP_HOME_PATH = "/";

export function goHome(search = ""): void {
  const path = `${APP_HOME_PATH}${search}`;
  if (isNativePlatform()) {
    hardReplace(path);
    return;
  }
  if (typeof window !== "undefined") {
    window.history.replaceState({}, "", path);
  }
}
