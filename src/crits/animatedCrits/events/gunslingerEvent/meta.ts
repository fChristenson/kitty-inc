import type { EventMeta } from "../../eventMeta";

// twirl, flip and fan the hammer
export default {
  label: "Gunslinger",
  style: "gunfire",
  reward: "hires",
  chance: 0.01,
  values: {
    twirlMs: 520, // the twirl round the button
    shotsMs: [200, 110] as [number, number], // between shots, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
