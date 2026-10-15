import type { EventMeta } from "../../eventMeta";

// flashbangs white out the screen and blow the locked floor open
export default {
  label: "Flashbang",
  style: "explosion",
  reward: "an unlock",
  chance: 0.01,
  values: {
    gapsMs: [520, 420] as [number, number], // between throws, quickening
    flyMs: 380, // each throw
    holdMs: 300,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
