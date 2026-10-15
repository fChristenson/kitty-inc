import type { EventMeta } from "../../eventMeta";

// a jet of cash waters empty spots into new workers
export default {
  label: "Garden Hose",
  style: "mix",
  reward: "free hires + cash",
  chance: 0.01,
  values: {
    swingMs: 160, // the jet swinging onto its next aim
    dwellsMs: [260, 140] as [number, number], // soaking each spot, quickening
    flightMs: 380, // each coin's arc
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
