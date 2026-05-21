export const SPEAKER_CHIP_CLASSES = [
  "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200",
] as const;

export function speakerChipClass(speakerId: number): string {
  return SPEAKER_CHIP_CLASSES[(speakerId - 1) % SPEAKER_CHIP_CLASSES.length];
}
