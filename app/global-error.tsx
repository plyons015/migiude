"use client";

import { APP_NAME } from "@/lib/branding/app-name";
import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(`[${APP_NAME}]`, error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">
          {APP_NAME} hit an unexpected error. You can try again or restart the
          app.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
