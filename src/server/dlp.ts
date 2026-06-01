const REDACTION_MARKERS = ["[REDACTED]", "***REDACTED***", "<redacted>"];
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;

/** Returns human-readable labels for any DLP signals found in a tool result. */
export function detectRedactions(text: string): string[] {
  const hits: string[] = [];
  for (const marker of REDACTION_MARKERS) {
    if (text.includes(marker)) hits.push(marker);
  }
  if (SSN_PATTERN.test(text)) hits.push("SSN pattern");
  return hits;
}
