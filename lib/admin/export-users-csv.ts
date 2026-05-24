import type { AdminUserRow } from "@/lib/admin/types";

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadUsersCsv(users: AdminUserRow[]): void {
  const headers = [
    "uid",
    "email",
    "plan",
    "role",
    "suspended",
    "ai_calls_today",
    "cloud_stt_chunks_today",
    "ai_calls_month",
    "cloud_stt_minutes_month",
    "over_quota",
    "created_at",
    "last_login_at",
  ];
  const rows = users.map((u) =>
    [
      u.uid,
      u.email ?? "",
      u.plan,
      u.role,
      u.suspended ? "yes" : "no",
      String(u.usageToday.aiCalls),
      String(u.usageToday.cloudSttChunks),
      String(u.usageMonth.aiCalls),
      String(u.usageMonth.cloudSttMinutes),
      u.overQuota ? "yes" : "no",
      u.createdAt,
      u.lastLoginAt ?? "",
    ].map(escapeCsv),
  );
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ude-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
