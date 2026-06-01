import { describe, it, expect } from "vitest";
import { EVENT_SOURCES, isAgentEvent } from "./events";

describe("events types", () => {
  it("lists the six event sources", () => {
    expect(EVENT_SOURCES).toEqual([
      "identity", "gateway", "agent_handler", "dlp", "response", "error",
    ]);
  });

  it("validates an AgentEvent shape", () => {
    expect(isAgentEvent({ id: "evt_1", ts: 1, source: "gateway", kind: "route", summary: "x" })).toBe(true);
    expect(isAgentEvent({ id: "evt_1", ts: 1, source: "nope", kind: "route", summary: "x" })).toBe(false);
    expect(isAgentEvent({ id: "evt_1" })).toBe(false);
  });
});
