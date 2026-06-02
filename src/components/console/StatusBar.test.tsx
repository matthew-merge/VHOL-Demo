import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBar, { deriveStatus } from "./StatusBar";
import type { AgentEvent } from "../../lib/events";

const events: AgentEvent[] = [
  { id: "1", ts: 1, source: "agent_handler", kind: "ru_create", summary: "", detail: { response: { id: "ru_9f3a" } } },
  { id: "2", ts: 2, source: "gateway", kind: "route", summary: "", detail: { model: "anthropic/claude-opus-4-7", usage: { input_tokens: 800, output_tokens: 40 } } },
];

describe("deriveStatus", () => {
  it("pulls model, RU id and token totals from events", () => {
    const s = deriveStatus(events);
    expect(s.model).toBe("anthropic/claude-opus-4-7");
    expect(s.ruId).toBe("ru_9f3a");
    expect(s.tokens).toBe(840);
  });
});

describe("StatusBar", () => {
  it("renders the derived values", () => {
    render(<StatusBar events={events} />);
    expect(screen.getByText(/ru_9f3a/)).toBeInTheDocument();
    expect(screen.getByText(/claude-opus-4-7/)).toBeInTheDocument();
    expect(screen.getByText(/840/)).toBeInTheDocument();
  });
});
