import type { EventMeta } from "../../eventMeta";

// a comb raises static on the workers, then they discharge
export default {
  label: "Hair Raiser",
  style: "lightning",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    passesMs: [520, 320] as [number, number], // each pass of the comb
    zapsMs: [200, 110] as [number, number], // between discharges
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
