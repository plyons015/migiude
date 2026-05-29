"use client";

import { AuthGate } from "@/components/auth-gate";
import { SettingsView } from "@/components/settings/settings-view";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <AuthGate>
        {() => <SettingsView />}
      </AuthGate>
    </main>
  );
}
