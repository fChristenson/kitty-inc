import type { EventMeta } from "../../eventMeta";

// lightning strikes a kite and runs down its string
export default {
  label: "Storm Kite",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    climbMs: 400, // the kite climbing
    strikesMs: [320, 180] as [number, number], // between strikes, quickening
    runMs: 200, // each spark down the string
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
