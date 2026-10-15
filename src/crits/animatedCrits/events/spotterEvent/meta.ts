import type { EventMeta } from "../../eventMeta";

// a spotter marks empty spots for a sniper
export default {
  label: "Spotter",
  style: "gunfire",
  reward: "hires",
  chance: 0.01,
  values: {
    callsMs: [300, 170] as [number, number], // between calls, quickening
    aimMs: 200, // the aim line before each shot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
