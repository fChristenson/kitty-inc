import type { EventMeta } from "../../eventMeta";

// guns at both edges trade volleys of pellets that splat gold onto the bars
export default {
  label: "Paintball",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    growMs: 250, // the guns popping up
    volleyMs: 230, // between volleys, quickening
    levelShare: 0.012, // levels per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
