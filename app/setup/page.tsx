import { SetupDashboard } from "@/components/setup-dashboard";
import { isFirebaseConfigured } from "@/lib/env/client";

export const metadata = {
  title: "Setup — Migiude",
};

export default function SetupPage() {
  return (
    <main className="flex flex-1 flex-col px-6">
      <SetupDashboard firebaseConfigured={isFirebaseConfigured()} />
    </main>
  );
}
