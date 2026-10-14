import type { CritMeta } from "../../../critKit/meta";

// a drill grinding into its own bar's end, gouts of its sparks thrown onto
// every other bar in view: each runs faster for a while
export default {
  label: "Grindstone",
  chance: 0.03,
  style: "drill",
  // how many times as fast a bar runs, for how long (ms; its own ownMs)
  values: { speed: 2, ms: 30_000, ownMs: 60_000 },
} satisfies CritMeta;
