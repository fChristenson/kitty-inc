import type { EventMeta } from "../../eventMeta";

// dancing jets of cash leap bar by bar
export default {
  label: "Fountain Show",
  style: "money",
  reward: "levels and cash",
  chance: 0.01,
  values: {
    waveMs: 500, // rippling before the first leap
    leapsMs: [330, 220] as [number, number], // between leaps, quickening
    finaleMs: 550, // the jets shooting into the total
    levelShare: 0.03, // per bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
