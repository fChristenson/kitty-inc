import type { EventMeta } from "../../eventMeta";

// needles rain onto the bars, each landing across one levelling it
export default {
  label: "Buffon's Needle",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    dropMs: [70, 25] as [number, number], // between needles, quickening
    fallMs: 260, // each needle's tumble down
    levelShare: 0.01, // levels per needle across a bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
