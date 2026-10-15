import type { EventMeta } from "../../eventMeta";

// toast wisps pop up and burst into coins
export default {
  label: "Toaster",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    roundsMs: [420, 260] as [number, number], // between rounds, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
