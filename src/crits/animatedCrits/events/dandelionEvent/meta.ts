import type { EventMeta } from "../../eventMeta";

// a puff of seed wisps blown into the total
export default {
  label: "Dandelion",
  style: "wisp",
  chance: 0.01,
  values: {
    gatherMs: 700, // the puffball swelling
    tearGapMs: 50, // between seeds tearing off
    flightMs: 650, // each seed's flight
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
