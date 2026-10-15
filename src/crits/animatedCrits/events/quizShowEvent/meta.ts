import type { EventMeta } from "../../eventMeta";

// buzz, correct, crit tier
export default {
  label: "Quiz Show",
  style: "experiment",
  reward: "tiers",
  chance: 0.01,
  values: {
    questionsMs: [380, 240] as [number, number], // before each buzz, quickening
    answerMs: 220, // from buzz to answer
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
