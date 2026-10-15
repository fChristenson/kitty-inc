import type { EventMeta } from "../../eventMeta";

// a defuser wisp zips between bombs over the workers, each blowing as it
// arrives
export default {
  label: "Bomb Squad",
  style: "explosion",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    hopsMs: [380, 200] as [number, number], // each hop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
