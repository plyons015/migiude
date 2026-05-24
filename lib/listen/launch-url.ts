/** Build Listen URL with optional auto-start from the home mic control. */
export function listenLaunchUrl(options: {
  mode: "device" | "cloud";
  meeting?: boolean;
  templateId?: string;
}): string {
  const params = new URLSearchParams({
    autostart: "1",
    start: options.mode === "cloud" ? "cloud" : "device",
  });
  if (options.meeting) params.set("meeting", "1");
  if (options.templateId) params.set("template", options.templateId);
  return `/listen/?${params.toString()}`;
}

export type ListenLaunchParams = {
  autostart: boolean;
  mode: "device" | "cloud" | null;
  meeting: boolean;
  templateId: string | null;
};

export function parseListenLaunchParams(
  searchParams: URLSearchParams,
): ListenLaunchParams {
  const start = searchParams.get("start");
  const mode =
    start === "cloud" ? "cloud" : start === "device" ? "device" : null;
  return {
    autostart: searchParams.get("autostart") === "1",
    mode,
    meeting: searchParams.get("meeting") === "1",
    templateId: searchParams.get("template"),
  };
}
