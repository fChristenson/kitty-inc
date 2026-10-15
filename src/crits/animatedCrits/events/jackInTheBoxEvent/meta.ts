import type { EventMeta } from "../../eventMeta";

// crank, POP!, spring up
export default {
  label: "Jack-in-the-Box",
  style: "experiment",
  reward: "unlock",
  chance: 0.01,
  values: {
    windMs: 950, // the crank winding up, quickening
    springMs: [190, 130] as [number, number], // each floor sprung, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
