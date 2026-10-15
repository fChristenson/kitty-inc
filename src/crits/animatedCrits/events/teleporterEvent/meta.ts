import type { EventMeta } from "../../eventMeta";

// workers beam in on the empty spots
export default {
  label: "Teleporter",
  style: "beam",
  reward: "hires",
  chance: 0.01,
  values: {
    spotMs: [520, 280] as [number, number], // each spot, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
