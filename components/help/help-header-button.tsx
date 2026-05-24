"use client";

import { HelpHubPanel } from "@/components/help/help-hub-panel";
import { useUserSupportTickets } from "@/hooks/use-user-support-tickets";
import { cn } from "@/lib/utils";
import { CircleHelp } from "lucide-react";
import { useState } from "react";

type HelpHeaderButtonProps = {
  className?: string;
};

export function HelpHeaderButton({ className }: HelpHeaderButtonProps) {
  const { unreadCount } = useUserSupportTickets();
  const [open, setOpen] = useState(false);
  const [openTab, setOpenTab] = useState<"guide" | "messages">("guide");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpenTab(unreadCount > 0 ? "messages" : "guide");
          setOpen(true);
        }}
        className={cn(
          "relative rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground",
          className,
        )}
        aria-label={
          unreadCount > 0
            ? `Help, ${unreadCount} new support ${unreadCount === 1 ? "reply" : "replies"}`
            : "Help"
        }
      >
        <CircleHelp className="h-5 w-5" strokeWidth={2} />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background" />
        ) : null}
      </button>

      <HelpHubPanel
        open={open}
        onClose={() => setOpen(false)}
        initialTab={openTab}
        unreadCount={unreadCount}
      />
    </>
  );
}
