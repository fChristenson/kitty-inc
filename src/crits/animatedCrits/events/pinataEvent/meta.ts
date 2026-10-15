import type { EventMeta } from "../../eventMeta";

// wisps whack a swinging wisp piñata
export default {
  label: "Pinata",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    dropMs: 280, // the piñata dropping in
    gapsMs: [220, 90] as [number, number], // between whacks, quickening
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
