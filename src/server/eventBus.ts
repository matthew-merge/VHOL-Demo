import type { AgentEvent, EventSource } from "../lib/events";

type Subscriber = (event: AgentEvent) => void;

class EventBus {
  private log: AgentEvent[] = [];
  private subscribers = new Set<Subscriber>();
  private seq = 0;

  emit(source: EventSource, kind: string, summary: string, detail?: unknown): AgentEvent {
    const event: AgentEvent = {
      id: `evt_${++this.seq}`,
      ts: Date.now(),
      source,
      kind,
      summary,
      detail,
    };
    this.log.push(event);
    for (const fn of this.subscribers) fn(event);
    return event;
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  getLog(): AgentEvent[] {
    return [...this.log];
  }

  clear(): void {
    this.log = [];
  }
}

export const bus = new EventBus();
