import type { EventMeta } from "../../eventMeta";

// a heaving sea of cash blasts jets up into the bars
export default {
  label: "Blowhole",
  style: "money",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    swellMs: 450, // the sea rolling in before the first jet
    jetsMs: [380, 240] as [number, number], // between jets, quickening
    levelShare: 0.03, // per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
