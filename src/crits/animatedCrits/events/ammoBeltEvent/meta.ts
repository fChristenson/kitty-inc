import type { EventMeta } from "../../eventMeta";

// a belt-fed gun rakes the bars
export default {
  label: "Ammo Belt",
  style: "gunfire",
  reward: "levels",
  chance: 0.01,
  values: {
    shotMs: 55, // between shots in a burst
    burstsMs: [220, 120] as [number, number], // between bursts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
