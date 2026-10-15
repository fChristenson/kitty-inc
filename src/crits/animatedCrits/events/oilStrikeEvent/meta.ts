import type { EventMeta } from "../../eventMeta";

// drills bore into the bottom and strike gushers of cash
export default {
  label: "Oil Strike",
  style: "drill",
  reward: "cash",
  chance: 0.01,
  values: {
    approachMs: 220, // a drill's plunge onto the ground
    boresMs: [520, 340] as [number, number], // each bore, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
