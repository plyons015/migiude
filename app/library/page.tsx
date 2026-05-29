"use client";

import { Suspense } from "react";
import { ArchiveRedirect } from "@/components/archive/archive-redirect";
import { meetingsUrlFromLibrarySearch } from "@/lib/meetings/routes";
import { Loader2 } from "lucide-react";

export default function LibraryRedirectPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        }
      >
        <ArchiveRedirect mapSearch={meetingsUrlFromLibrarySearch} />
      </Suspense>
    </main>
  );
}
