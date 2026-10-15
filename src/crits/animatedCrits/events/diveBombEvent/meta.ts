import type { EventMeta } from "../../eventMeta";

// circling wisps dive-bomb the button
export default {
  label: "Dive Bomb",
  style: "wisp",
  chance: 0.01,
  values: {
    circleMs: 650, // the ring circling before the first dive
    gapsMs: [300, 250, 200, 160], // between dives, quickening
    diveMs: 260, // each plunge
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
