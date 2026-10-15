import type { EventMeta } from "../../eventMeta";

// groups of bombs blink into step and go off together
export default {
  label: "Lockstep",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    pullsMs: [250, 600, 950] as [number, number, number], // when each group starts pulling into step
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
