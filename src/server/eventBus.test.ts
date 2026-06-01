import { describe, it, expect, beforeEach } from "vitest";
import { bus } from "./eventBus";

beforeEach(() => bus.clear());

describe("eventBus", () => {
  it("emits events with incrementing ids and stores them in the log", () => {
    const a = bus.emit("gateway", "route", "routed");
    const b = bus.emit("response", "message", "hi");
    expect(a.id).not.toBe(b.id);
    expect(a.source).toBe("gateway");
    expect(bus.getLog()).toHaveLength(2);
  });

  it("notifies subscribers and stops after unsubscribe", () => {
    const seen: string[] = [];
    const unsub = bus.subscribe((e) => seen.push(e.summary));
    bus.emit("identity", "login", "one");
    unsub();
    bus.emit("identity", "login", "two");
    expect(seen).toEqual(["one"]);
  });

  it("clear() empties the log", () => {
    bus.emit("gateway", "route", "x");
    bus.clear();
    expect(bus.getLog()).toEqual([]);
  });
});
