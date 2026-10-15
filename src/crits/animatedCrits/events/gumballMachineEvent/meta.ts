import type { EventMeta } from "../../eventMeta";

// a gumball machine drops gumballs onto empty spots
export default {
  label: "Gumball Machine",
  style: "experiment",
  reward: "hires",
  chance: 0.01,
  values: {
    fillMs: 500, // the globe filling
    cranksMs: [300, 160] as [number, number], // between cranks, quickening
    rollMs: 450, // each gumball's bounce down
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
