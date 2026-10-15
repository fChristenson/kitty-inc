import type { CritMeta } from "../../../critKit/meta";

// a tornado drops onto the locked floor, sweeps up its glitter, bores into
// the lock and bursts it open: the new bar starts spinning fast, winding down
export default {
  label: "Whirlwind",
  chance: 0.03,
  style: "tornado",
  // the speed the opened bar starts at, winding down to normal over ms
  values: { speed: 3, ms: 40_000 },
} satisfies CritMeta;
