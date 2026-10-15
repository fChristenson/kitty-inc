import type { EventMeta } from "../../eventMeta";

// a claw grabs prizes out of a pile of cash
export default {
  label: "Claw Machine",
  style: "experiment",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    pileMs: 450, // the pile heaping up
    grabsMs: [700, 450] as [number, number], // each grab, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
