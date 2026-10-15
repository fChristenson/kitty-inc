import type { EventMeta } from "../../eventMeta";

// two gunners duel, then turn on the bars
export default {
  label: "Duel",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    skidMs: 350, // the gunners skidding out
    duelsMs: [240, 110] as [number, number], // between shots, quickening
    turnMs: 200, // the turn onto the bars
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
