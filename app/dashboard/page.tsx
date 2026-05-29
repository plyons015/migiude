"use client";

import { AuthGate } from "@/components/auth-gate";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        }
      >
        <AuthGate>{(uid) => <DashboardView userId={uid} />}</AuthGate>
      </Suspense>
    </main>
  );
}
