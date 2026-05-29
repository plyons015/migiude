"use client";

import { Suspense } from "react";
import { AuthGate } from "@/components/auth-gate";
import { PeopleView } from "@/components/people/people-view";
import { Loader2 } from "lucide-react";

export default function PeoplePage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        }
      >
        <AuthGate>{(uid) => <PeopleView userId={uid} />}</AuthGate>
      </Suspense>
    </main>
  );
}

