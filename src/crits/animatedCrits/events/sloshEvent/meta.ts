import type { EventMeta } from "../../eventMeta";

// a pool of cash sloshes, then surges into the total
export default {
  label: "Slosh",
  chance: 0.01,
  values: {
    pourMs: 550, // the button gushing the pool full
    fallMs: 300, // each coin's fall into the pool
    sloshMs: 420, // each slosh across
    surgeMs: 400, // each coin's surge up the wall into the total
    holdMs: 450,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
