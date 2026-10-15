import type { EventMeta } from "../../eventMeta";

// a wisp ball rolls across the frozen screen lane by lane, picking up the
// glitter, bigger and quicker, then bursts, flinging wisps onto every empty
// spot, each a new worker
export default {
  label: "Rolling Stone",
  style: "snowball",
  reward: "hires",
  chance: 0.01,
  values: {
    firstMs: 250, // from the click till the ball starts rolling
    rollsMs: [600, 320] as [number, number], // a lane's roll, quickening
    hireMs: 360, // from the burst till the first hire lands
    hireGapMs: 70, // between the hires landing
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
