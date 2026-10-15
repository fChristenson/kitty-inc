import type { EventMeta } from "../../eventMeta";

// the rare "Ripple" event: coins burst out of the button in round ripples,
// wide bands each trailed by a thin ring or two, that keep rolling outward at
// their own pace, then sweep into the total; pays once per ring
export default {
  label: "Ripple",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    rings: 6,
    thinGapMs: [90, 140] as [number, number], // a thin ring following close behind
    wideGapMs: [260, 360] as [number, number], // before the next wide band
    rippleMs: 2_400, // the rings rolling out, until the coins sweep into the total
    mergeMs: 500, // the coins flying into the total
  },
} as const satisfies EventMeta;
