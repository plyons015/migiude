"use client";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { useAuthUser } from "@/hooks/use-auth-user";

export default function DashboardPage() {
  const { uid } = useAuthUser();

  if (!uid) return null;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <DashboardView userId={uid} />
    </main>
  );
}
