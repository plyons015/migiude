/** Fast local check before calling AI for commitment detection. */
const COMMITMENT_PATTERNS = [
  /\bi(?:'ll| will)\b/i,
  /\bi need to\b/i,
  /\bi have to\b/i,
  /\bi'?m going to\b/i,
  /\bi plan to\b/i,
  /\bi should\b/i,
  /\bremind me to\b/i,
  /\bmake sure (?:i|to)\b/i,
  /\bthis afternoon\b/i,
  /\btomorrow\b/i,
  /\bby (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d)/i,
];

export function mightContainCommitment(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  return COMMITMENT_PATTERNS.some((re) => re.test(t));
}
