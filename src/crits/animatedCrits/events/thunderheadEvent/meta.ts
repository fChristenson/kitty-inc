import type { EventMeta } from "../../eventMeta";

// a thunderhead of wisps strikes the workers
export default {
  label: "Thunderhead",
  style: "lightning",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    gatherMs: 450, // the cloud gathering
    strikesMs: [280, 130] as [number, number], // between strikes, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
