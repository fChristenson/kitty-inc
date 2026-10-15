import type { EventMeta } from "../../eventMeta";

// bolts crack a giant egg of light open over the clicked bar
export default {
  label: "Thunder Egg",
  style: "lightning",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    strikesMs: [260, 110] as [number, number], // between strikes, quickening
    dropMs: 260, // what hatches slamming onto the bar
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
