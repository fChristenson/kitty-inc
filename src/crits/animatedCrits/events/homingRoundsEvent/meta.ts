import type { EventMeta } from "../../eventMeta";

// curling rounds home in
export default {
  label: "Homing Rounds",
  style: "gunfire",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    volleysMs: [320, 160] as [number, number], // between volleys, quickening
    flightMs: 520,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
