import type { EventMeta } from "../../eventMeta";

// banked shots pop patches of bubble wisps
export default {
  label: "Bubble Shooter",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    fillMs: 500, // the cluster filling in
    shotsMs: [420, 260] as [number, number], // between shots, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
