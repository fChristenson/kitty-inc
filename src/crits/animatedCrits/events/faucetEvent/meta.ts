import type { EventMeta } from "../../eventMeta";

// a tap drips cash onto the clicked bar, then gushes
export default {
  label: "Faucet",
  style: "money",
  reward: "crit tier + cash",
  chance: 0.01,
  values: {
    dripsMs: [300, 120] as [number, number], // between drips, quickening
    fallMs: 350, // each drop's fall
    gushMs: 500, // the gush pouring
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
