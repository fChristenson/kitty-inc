import type { EventMeta } from "../../eventMeta";

// each bar blooms into a dome fountain of cash
export default {
  label: "Dome Fountains",
  style: "money",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    domesMs: [420, 240] as [number, number], // between domes, quickening
    streamMs: 260,
    travelMs: 420,
    levelShare: 0.04,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
