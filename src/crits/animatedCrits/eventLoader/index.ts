// The ~1,100 event modules are most of the game's code, so they ship in
// chunks: a small starter pile of every look, then 8 big parts, each loaded
// on its own while the game is quiet (shared/idle's loadWhenIdle, queued by
// main.ts). Only the loaded events can claim a crit; crits roll as plain
// crits until the starter pile is in.
import { loadWhenIdle } from "../../../shared/idle";

const PARTS = [
  () => import("./eventsStarter"),
  () => import("./events0"),
  () => import("./events1"),
  () => import("./events2"),
  () => import("./events3"),
  () => import("./events4"),
  () => import("./events5"),
  () => import("./events6"),
  () => import("./events7"),
];

export type EventCatalog = typeof import("./eventsStarter") &
  typeof import("./events0") &
  typeof import("./events1") &
  typeof import("./events2") &
  typeof import("./events3") &
  typeof import("./events4") &
  typeof import("./events5") &
  typeof import("./events6") &
  typeof import("./events7");

const parts = new Map<number, Promise<object>>();
let partsRequested = 0;
let loading: Promise<EventCatalog> | null = null;

function loadPart(index: number): Promise<object> {
  let part = parts.get(index);
  if (!part) {
    part = PARTS[index]();
    parts.set(index, part);
  }
  return part;
}

// every event, all chunks at once (dev test buttons, the perf rig): asked for
// on a click, so it doesn't wait for the game to go idle
export function loadEventCatalog(): Promise<EventCatalog> {
  return (loading ??= Promise.all(PARTS.map((_, i) => loadPart(i))).then(
    (loaded) => Object.assign({}, ...loaded) as EventCatalog,
  ));
}

// loads the next chunk of events, if any are left
export function loadNextEventPart(): Promise<unknown> {
  if (partsRequested >= PARTS.length) return Promise.resolve();
  return loadPart(partsRequested++);
}

// queues up to count more chunks (all that are left by default), each loaded
// on its own at idle
let partsQueued = 0;
export function queueEventParts(count = PARTS.length): void {
  for (let n = 0; n < count && partsQueued < PARTS.length; n++, partsQueued++)
    loadWhenIdle(loadNextEventPart);
}
