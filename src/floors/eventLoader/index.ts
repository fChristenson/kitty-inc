// The ~1,100 event modules are most of the game's code, so they ship in
// chunks: a small starter pile of every look loads once the game is on screen
// (main.ts), then one of the 8 big parts after each event plays out, in the
// cooldown when none can land, so no chunk's load competes with startup or
// with an event. Only the loaded events can claim a crit; crits roll as plain
// crits until the starter pile is in.
import { runWhenIdle } from "../../shared/idle";

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

const PART_GAP_TIMEOUT_MS = 1000;

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

function idleGap(): Promise<void> {
  return new Promise((resolve) => runWhenIdle(resolve, PART_GAP_TIMEOUT_MS));
}

// loads the next chunk of events, if any are left
export function loadNextEventPart(): Promise<unknown> {
  if (partsRequested >= PARTS.length) return Promise.resolve();
  return loadPart(partsRequested++);
}

// every event, one chunk per idle gap (dev test buttons, the perf rig)
export function loadEventCatalog(): Promise<EventCatalog> {
  return (loading ??= (async () => {
    const loaded: object[] = [];
    for (let i = 0; i < PARTS.length; i++) {
      if (loaded.length > 0 && !parts.has(i)) await idleGap();
      loaded.push(await loadPart(i));
    }
    return Object.assign({}, ...loaded) as EventCatalog;
  })());
}
