"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type ArchiveRedirectProps = {
  mapSearch: (search: string) => string;
};

export function ArchiveRedirect({ mapSearch }: ArchiveRedirectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    router.replace(mapSearch(searchParams.toString()));
  }, [router, searchParams, mapSearch]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  );
}
