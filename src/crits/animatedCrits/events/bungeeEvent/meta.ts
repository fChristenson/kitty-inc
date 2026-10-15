import type { EventMeta } from "../../eventMeta";

// a rope of cash plunges onto the bars and recoils
export default {
  label: "Bungee",
  style: "money",
  reward: "crit tiers + cash",
  chance: 0.01,
  values: {
    plungesMs: [380, 260] as [number, number], // each plunge, quickening
    recoilMs: 220, // each recoil
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
