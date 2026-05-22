/**
 * FCM push is opt-in. Calling PushNotifications.register() without
 * android/app/google-services.json can crash the native Android app.
 */
export function isFcmPushEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_FCM === "true";
}
