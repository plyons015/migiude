/** Firestore Timestamp JSON from callable responses. */
export function formatFirestoreTimestamp(value: unknown): string {
  if (!value || typeof value !== "object") return "—";
  const sec =
    "_seconds" in value && typeof (value as { _seconds: number })._seconds === "number"
      ? (value as { _seconds: number })._seconds
      : "seconds" in value && typeof (value as { seconds: number }).seconds === "number"
        ? (value as { seconds: number }).seconds
        : null;
  if (sec == null) return "—";
  return new Date(sec * 1000).toLocaleString();
}
