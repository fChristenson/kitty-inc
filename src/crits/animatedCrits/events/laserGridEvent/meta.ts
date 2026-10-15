import type { EventMeta } from "../../eventMeta";

// lasers build a grid, cash pops along them
export default {
  label: "Laser Grid",
  style: "beam",
  chance: 0.01,
  values: {
    gapMs: 200, // between lasers
    aimMs: 140, // each aim line flickering before it fires
    zipMs: 110, // each beam blazing from edge to edge
    flightMs: 380, // each coin's flight into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
