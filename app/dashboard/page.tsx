"use client";

import { AuthGate } from "@/components/auth-gate";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function DashboardPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <AuthGate>{(uid) => <DashboardView userId={uid} />}</AuthGate>
    </main>
  );
}
