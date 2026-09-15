import type { ImageName } from "../../loadAssets";

export interface CritDisplayEvent {
  label: string;
  color: string;
  icon?: ImageName;
}

type CritDisplayListener = (event: CritDisplayEvent) => void;

const listeners = new Set<CritDisplayListener>();
const pendingEvents: CritDisplayEvent[] = [];
let draining = false;

export function subscribeCritDisplayEvents(
  listener: CritDisplayListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function enqueueCritDisplayEvents(events: CritDisplayEvent[]): void {
  pendingEvents.push(...events);
  drainCritDisplayEvents();
}

function drainCritDisplayEvents(): void {
  if (draining) return;
  draining = true;
  while (pendingEvents.length > 0) {
    const event = pendingEvents.shift()!;
    for (const listener of listeners) listener(event);
  }
  draining = false;
}
