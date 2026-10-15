import type { EventMeta } from "../../eventMeta";

// a hand scoops jacks between bounces and flicks them onto the spots
export default {
  label: "Jacks",
  style: "bounce",
  reward: "free hires",
  chance: 0.01,
  values: {
    tossesMs: [520, 300] as [number, number], // each toss, quickening
    flickMs: 300,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
