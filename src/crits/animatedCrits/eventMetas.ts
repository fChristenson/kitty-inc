// every animated crit's card, from its folder's meta.ts; only the test panel
// reads these, loaded after startup (loadEventMetas in crits/index.ts)
import type { EventMeta } from "./eventMeta";

export interface EventCard extends EventMeta {
  // the kebab key its test button is wired by (`#test-<key>-event`)
  key: string;
}

const METAS = import.meta.glob<EventMeta>("./events/*/meta.ts", {
  eager: true,
  import: "default",
});

// "./events/knightsTourEvent/meta.ts" -> "knights-tour", rule30Event -> "rule-30"
function eventKey(path: string): string {
  return path
    .slice("./events/".length, -"Event/meta.ts".length)
    .replace(/[A-Z]|\d+/g, (part) => `-${part.toLowerCase()}`);
}

export const EVENT_CARDS: readonly EventCard[] = Object.entries(METAS)
  .map(([path, meta]) => ({ ...meta, key: eventKey(path) }))
  .sort((a, b) => a.label.localeCompare(b.label));
