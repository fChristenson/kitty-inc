import type { CritMeta } from "../../../critKit/meta";

// a geyser of coins rumbling up under every readout and erupting through it:
// every bar gushes, running much faster for a few seconds
export default {
  label: "Old Faithful",
  chance: 0.03,
  style: "money",
  // how many times as fast a bar runs, for how long (ms; its own ownMs)
  values: { speed: 4, ms: 10_000, ownMs: 20_000 },
} satisfies CritMeta;
