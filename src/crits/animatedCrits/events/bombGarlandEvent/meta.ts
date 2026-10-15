import type { EventMeta } from "../../eventMeta";

// garlands of bombs blow in from both ends
export default {
  label: "Bomb Garland",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    burnsMs: [420, 240] as [number, number], // each garland's burn, quickening
    levelShare: 0.04,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
