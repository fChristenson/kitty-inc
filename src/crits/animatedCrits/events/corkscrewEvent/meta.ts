import type { EventMeta } from "../../eventMeta";

// a wisp corkscrews up to the locked floor trailing cash
export default {
  label: "Corkscrew",
  style: "mix",
  reward: "an unlock + cash",
  chance: 0.01,
  values: {
    climbMs: 900, // corkscrewing up the building
    orbitMs: 900, // whirling round the locked floor, ever tighter
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
