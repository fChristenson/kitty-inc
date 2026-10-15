import type { EventMeta } from "../../eventMeta";

// a gravity hole spirals and bumps round like a robot vacuum, eating glitter,
// then docks in the lock
export default {
  label: "Robovac",
  style: "clutter",
  reward: "a free floor",
  chance: 0.01,
  values: {
    dumpMs: 400, // the glitter raining down
    spiralMs: 650, // the spiral out round the button
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
