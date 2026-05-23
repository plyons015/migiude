"use client";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminGate } from "@/components/admin/admin-gate";

export default function AdminPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <AdminGate>
        <AdminDashboard />
      </AdminGate>
    </main>
  );
}
