import type { EventMeta } from "../../eventMeta";

// grenades blow on the workers and fragment
export default {
  label: "Frag Out",
  style: "explosion",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    gapsMs: [320, 180] as [number, number], // between grenades, quickening
    flightMs: 400, // each grenade's lob
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
