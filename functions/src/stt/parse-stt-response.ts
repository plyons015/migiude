import { sttResponseSchema, type SttResponse, type SttSegment } from "./types";

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return body.slice(start, end + 1);
}

/** Recover segment objects from truncated or slightly invalid JSON. */
function salvageSegmentsFromText(raw: string): SttSegment[] {
  const segments: SttSegment[] = [];
  const re =
    /"speakerId"\s*:\s*(\d+)\s*,\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    const speakerId = Number(match[1]);
    const text = match[2]!
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .trim();
    if (!text || speakerId < 1 || speakerId > 8) continue;
    segments.push({ speakerId, text });
  }
  return segments;
}

export function looksLikeJsonLeak(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.startsWith("{") || t.startsWith("[")) return true;
  if (t.includes('"segments"') || t.includes('"speakerId"')) return true;
  if (t.includes('{"segment')) return true;
  return false;
}

export function parseSttResponse(raw: string): SttResponse {
  const jsonText = extractJsonObject(raw);
  if (jsonText) {
    try {
      const parsed = sttResponseSchema.safeParse(JSON.parse(jsonText));
      if (parsed.success) {
        return parsed.data;
      }
    } catch {
      /* try salvage */
    }
  }

  const salvaged = salvageSegmentsFromText(raw);
  if (salvaged.length > 0) {
    return { segments: salvaged };
  }

  throw new Error("STT model did not return parseable JSON segments.");
}
