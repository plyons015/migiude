import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativePlatform } from "@/lib/capacitor/platform";

/** Light tap — quick on-device start */
export async function hapticTap(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* unavailable */
  }
}

/** Mid-hold — meeting mode threshold (purple ring) */
export async function hapticMeetingHint(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* unavailable */
  }
}

/** Hold complete — meeting session started */
export async function hapticMeetingStart(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* unavailable */
  }
}
