import type { EventMeta } from "../../eventMeta";

// the screen is fed through a shredder
export default {
  label: "Shredder",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    jerksMs: [300, 160] as [number, number], // between jerks, quickening
    spitMs: 220,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
