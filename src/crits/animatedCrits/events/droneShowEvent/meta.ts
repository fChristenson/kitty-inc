import type { EventMeta } from "../../eventMeta";

// glitter drones lift off and form a giant lightning bolt, which strikes the
// lock
export default {
  label: "Drone Show",
  style: "drawing",
  reward: "a free floor",
  chance: 0.01,
  values: {
    flyMs: 1300, // every drone launched, quickening
    climbMs: 420, // each drone's climb into place
    blazeMs: 260, // the finished bolt blazing
    strikeMs: 220, // the bolt hurling itself into the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
