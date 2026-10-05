// The ~1,100 event modules are most of the game's code, so they ship in
// their own chunks, loaded after the game is on screen (main.ts), one part
// per idle gap so no single parse/eval lands as one long freeze. Until they
// arrive no event can claim a crit; crits roll as plain crits meanwhile.
import { runWhenIdle } from "../../shared/idle";

const PARTS = [
  () => import("./events0"),
  () => import("./events1"),
  () => import("./events2"),
  () => import("./events3"),
  () => import("./events4"),
  () => import("./events5"),
  () => import("./events6"),
  () => import("./events7"),
];

export type EventCatalog = typeof import("./events0") &
  typeof import("./events1") &
  typeof import("./events2") &
  typeof import("./events3") &
  typeof import("./events4") &
  typeof import("./events5") &
  typeof import("./events6") &
  typeof import("./events7");

const PART_GAP_TIMEOUT_MS = 1000;

let loading: Promise<EventCatalog> | null = null;

function idleGap(): Promise<void> {
  return new Promise((resolve) => runWhenIdle(resolve, PART_GAP_TIMEOUT_MS));
}

export function loadEventCatalog(): Promise<EventCatalog> {
  return (loading ??= (async () => {
    const parts: object[] = [];
    for (const load of PARTS) {
      if (parts.length > 0) await idleGap();
      parts.push(await load());
    }
    return Object.assign({}, ...parts) as EventCatalog;
  })());
}
