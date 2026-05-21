"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Static-export friendly redirect to dashboard. */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/");
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
      Opening dashboard…
    </main>
  );
}
