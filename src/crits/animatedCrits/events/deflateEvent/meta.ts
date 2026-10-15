import type { EventMeta } from "../../eventMeta";

// a balloon of cash zips round the screen deflating
export default {
  label: "Deflate",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    blowMs: 600,
    zipMs: 1300,
    levelShare: 0.04,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
