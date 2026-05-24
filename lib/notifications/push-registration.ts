import { APP_NAME } from "@/lib/branding/app-name";
import { doc, setDoc } from "firebase/firestore";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/env/client";
import { isFcmPushEnabled } from "@/lib/notifications/fcm-enabled";
import { isLocalOnlyMode } from "@/lib/settings/preferences";

let listenersAttached = false;

export async function registerPushNotifications(
  userId: string,
): Promise<void> {
  if (
    !isNativePlatform() ||
    !isFcmPushEnabled() ||
    !isFirebaseConfigured() ||
    isLocalOnlyMode()
  ) {
    return;
  }

  try {
    const { PushNotifications } = await import(
      "@capacitor/push-notifications"
    );

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;

    if (!listenersAttached) {
      listenersAttached = true;

      await PushNotifications.addListener("registration", async (token) => {
        const db = getFirebaseDb();
        if (!db || !token.value) return;
        await setDoc(
          doc(db, "users", userId, "private", "fcm"),
          {
            token: token.value,
            platform: "android",
            updatedAt: Date.now(),
          },
          { merge: true },
        );
      });

      await PushNotifications.addListener("registrationError", () => {
        /* google-services.json missing or FCM not configured */
      });

      await PushNotifications.addListener(
        "pushNotificationReceived",
        (notification) => {
          if (notification.title || notification.body) {
            void import("@/lib/notifications/native-reminders").then(
              ({ showImmediateLocalNotification }) =>
                showImmediateLocalNotification(
                  notification.title ?? APP_NAME,
                  notification.body ?? "",
                ),
            );
          }
        },
      );
    }

    await PushNotifications.register();
  } catch {
    /* FCM not configured — add android/app/google-services.json */
  }
}
