"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { registerPushNotifications } from "@/lib/notifications/push-registration";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { useEffect } from "react";

export function PushBootstrap({ children }: { children: React.ReactNode }) {
  const { uid } = useAuthUser();

  useEffect(() => {
    if (!uid || !isNativePlatform()) return;
    void registerPushNotifications(uid);
  }, [uid]);

  return children;
}
