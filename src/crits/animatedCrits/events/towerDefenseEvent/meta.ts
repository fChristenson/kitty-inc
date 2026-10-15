import type { EventMeta } from "../../eventMeta";

// towers gun down creeps marching along a road
export default {
  label: "Tower Defense",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    walkMs: 1100, // a creep's walk down the whole road
    spawnsMs: [90, 40] as [number, number], // between creeps, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
