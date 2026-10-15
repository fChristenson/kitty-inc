import type { EventMeta } from "../../eventMeta";

// a swelling wisp springs leaks of cash, then bursts
export default {
  label: "Leak",
  chance: 0.01,
  values: {
    leadMs: 300, // swelling before the first leak
    gapMs: 210, // between leaks
    travelMs: 700, // each coin's trip up a leak's jet
    gushMs: 450, // the final gush pouring
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
