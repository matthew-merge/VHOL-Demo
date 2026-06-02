import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EventInspector from "./EventInspector";
import type { AgentEvent } from "../../lib/events";

const event: AgentEvent = {
  id: "1", ts: 1, source: "gateway", kind: "route", summary: "routed → opus",
  detail: { model: "anthropic/claude-opus-4-7", usage: { input_tokens: 800 } },
};

describe("EventInspector", () => {
  it("renders the selected event's detail JSON", () => {
    render(<EventInspector event={event} />);
    expect(screen.getByText(/claude-opus-4-7/)).toBeInTheDocument();
    expect(screen.getByText(/input_tokens/)).toBeInTheDocument();
  });

  it("shows an empty state when nothing is selected", () => {
    render(<EventInspector event={null} />);
    expect(screen.getByText(/select an event/i)).toBeInTheDocument();
  });
});
