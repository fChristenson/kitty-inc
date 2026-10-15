import type { EventMeta } from "../../eventMeta";

// an eel of cash crackles across the screen
export default {
  label: "Electric Eel",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    swimMs: 1_500, // swimming across in S-waves
    diveMs: 300, // diving into the total
    discharges: 4, // its body flaring and lashing bolts
    holdMs: 200,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
