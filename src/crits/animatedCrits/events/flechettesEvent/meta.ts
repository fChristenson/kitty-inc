import type { EventMeta } from "../../eventMeta";

// shells burst into hails of darts on the locked floor
export default {
  label: "Flechettes",
  style: "gunfire",
  reward: "an unlock",
  chance: 0.01,
  values: {
    gapsMs: [500, 380] as [number, number], // between shells, quickening
    climbMs: 280, // each shell's climb
    holdMs: 300,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
