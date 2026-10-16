// The ~1,300 event modules are most of the game's code, so they ship in
// chunks: a small starter pile of every look (eventsStarter.ts, picked by
// hand), then the event chunks of src/crits/chunks (split by size, each a mix
// of old and new: see scripts/crit-chunks.mjs). Each is loaded
// on its own while the game is quiet (shared/idle's loadWhenIdle, queued by
// main.ts). Only the loaded events can claim a crit; crits roll as plain
// crits until the starter pile is in.
import { loadWhenIdle } from "../../../shared/idle";
import { EVENT_CHUNKS, type EventChunkHooks } from "../../chunks/manifest";

const PARTS: (() => Promise<object>)[] = [
  () => import("./eventsStarter"),
  ...EVENT_CHUNKS,
];

export type EventCatalog = typeof import("./eventsStarter") & EventChunkHooks;

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
