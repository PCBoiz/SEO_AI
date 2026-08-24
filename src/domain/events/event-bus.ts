export interface DomainEvent<Payload extends Record<string, unknown> = Record<string, unknown>> {
  eventId: string;
  occurredAt: Date;
  type: string;
  payload: Payload;
}

export type EventHandler<Event extends DomainEvent = DomainEvent> = (
  event: Event,
) => void | Promise<void>;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): () => void;
}
