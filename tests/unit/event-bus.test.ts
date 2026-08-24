import { describe, expect, it, vi } from "vitest";
import type { DomainEvent } from "@/domain/events/event-bus";
import { InMemoryEventBus } from "@/infrastructure/events/in-memory-event-bus";

const event: DomainEvent = {
  eventId: "event-1",
  occurredAt: new Date("2026-07-21T00:00:00.000Z"),
  type: "pipeline.started",
  payload: { pipelineId: "pipeline-1" },
};

describe("InMemoryEventBus", () => {
  it("publishes to exact and wildcard subscribers", async () => {
    const bus = new InMemoryEventBus();
    const exactHandler = vi.fn();
    const wildcardHandler = vi.fn();
    bus.subscribe("pipeline.started", exactHandler);
    bus.subscribe("*", wildcardHandler);

    await bus.publish(event);

    expect(exactHandler).toHaveBeenCalledWith(event);
    expect(wildcardHandler).toHaveBeenCalledWith(event);
  });

  it("unsubscribes handlers", async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe(event.type, handler);
    unsubscribe();

    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("surfaces subscriber failures", async () => {
    const bus = new InMemoryEventBus();
    bus.subscribe(event.type, async () => {
      throw new Error("subscriber failed");
    });

    await expect(bus.publish(event)).rejects.toThrow("subscriber failed");
  });
});
