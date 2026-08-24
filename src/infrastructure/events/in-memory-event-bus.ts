import type {
  DomainEvent,
  EventBus,
  EventHandler,
} from "@/domain/events/event-bus";

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  subscribe(eventType: string, handler: EventHandler): () => void {
    const handlersForType = this.handlers.get(eventType) ?? new Set();
    handlersForType.add(handler);
    this.handlers.set(eventType, handlersForType);

    return () => {
      handlersForType.delete(handler);
      if (handlersForType.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = [
      ...(this.handlers.get(event.type) ?? []),
      ...(this.handlers.get("*") ?? []),
    ];

    await Promise.all(handlers.map((handler) => handler(event)));
  }

  clear(): void {
    this.handlers.clear();
  }
}
