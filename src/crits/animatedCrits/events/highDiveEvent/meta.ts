import type { EventMeta } from "../../eventMeta";

// a wisp dives from a tower into a pool of cash
export default {
  label: "High Dive",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    climbMs: 450, // the climb up the tower
    teeterMs: 300, // the teeter on the board
    diveMs: 350, // the dive
    poolMs: 300, // the pool pouring
    spoutMs: 600, // the splash spouting
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
