import { describe, it, expect } from "vitest";
import { detectRedactions } from "./dlp";

describe("detectRedactions", () => {
  it("flags an explicit redaction marker", () => {
    const hits = detectRedactions('{"ssn":"[REDACTED]"}');
    expect(hits).toContain("[REDACTED]");
  });

  it("flags a raw SSN that leaked through", () => {
    const hits = detectRedactions("customer ssn 123-45-6789 on file");
    expect(hits.some((h) => h.includes("SSN"))).toBe(true);
  });

  it("flags the other redaction markers", () => {
    expect(detectRedactions("a ***REDACTED*** b")).toContain("***REDACTED***");
    expect(detectRedactions("a <redacted> b")).toContain("<redacted>");
  });

  it("returns [] for clean text", () => {
    expect(detectRedactions("order shipped on 6/3")).toEqual([]);
  });
});
