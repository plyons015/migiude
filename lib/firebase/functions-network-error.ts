import { FunctionsError } from "firebase/functions";

const NETWORK_HINT =
  "Cannot reach Firebase Cloud Functions (DNS/network). This PC or network cannot resolve cloudfunctions.net. " +
  "Try: set DNS to 8.8.8.8 or 1.1.1.1, run ipconfig /flushdns, disable VPN/proxy, or use mobile hotspot. " +
  "See docs/NETWORK_TROUBLESHOOTING.md.";

/** True when the browser failed to reach *.cloudfunctions.net (DNS, firewall, VPN). */
export function isCloudFunctionsNetworkFailure(error: unknown): boolean {
  if (error instanceof FunctionsError) {
    return (
      error.code === "functions/unavailable" ||
      error.code === "functions/deadline-exceeded"
    );
  }
  const msg =
    error instanceof Error
      ? `${error.message} ${error.name}`
      : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("name_not_resolved") ||
    lower.includes("err_name_not_resolved") ||
    lower.includes("load failed") ||
    lower.includes("enotfound")
  );
}

export function formatCloudFunctionsNetworkError(error: unknown): string | null {
  return isCloudFunctionsNetworkFailure(error) ? NETWORK_HINT : null;
}
