import type { EventMeta } from "../../eventMeta";

// the screen rocks like a boat, sloshing a mess of glitter side to side, then
// pours it into the lock
export default {
  label: "Rock the Boat",
  style: "clutter",
  reward: "a free floor",
  chance: 0.01,
  values: {
    dumpMs: 350, // the glitter washing down
    tiltMs: 520, // each roll, sliding it all one way
    pourMs: 600, // the last roll pouring it into the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
