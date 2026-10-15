import type { EventMeta } from "../../eventMeta";

// lanterns carry strings of cash up to the locked floor
export default {
  label: "Sky Lanterns",
  style: "mix",
  reward: "an unlock + cash",
  chance: 0.01,
  values: {
    gapsMs: [140, 70] as [number, number], // between lanterns, quickening
    floatMs: 900, // each lantern's float up
    liftMs: 300, // the flock lifting
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
