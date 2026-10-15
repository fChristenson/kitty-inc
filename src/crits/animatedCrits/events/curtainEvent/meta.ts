import type { EventMeta } from "../../eventMeta";

// a curtain of cash drops, opens, flies up
export default {
  label: "Curtain",
  style: "money",
  chance: 0.01,
  values: {
    dropMs: 420, // the curtain dropping
    hangMs: 260, // hanging, rippling
    openMs: 420, // drawn open to the sides
    sweepMs: 260, // the coins setting off for the total, top rows first
    flightMs: 420, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
