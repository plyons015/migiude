"use client";

import { signOutUser } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { useState } from "react";

type LogoutHeaderButtonProps = {
  className?: string;
  iconClassName?: string;
};

export function LogoutHeaderButton({
  className,
  iconClassName = "h-5 w-5",
}: LogoutHeaderButtonProps) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void signOutUser().finally(() => setBusy(false));
      }}
      className={cn(
        "rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50",
        className,
      )}
      aria-label="Sign out"
    >
      <LogOut className={iconClassName} strokeWidth={2} />
    </button>
  );
}
