import type { CritMeta } from "../../../critKit/meta";

// a ball of light dribbled down every readout, harder and harder, slammed on
// its own: each bar's speed bounces, flat out at the start of every beat
export default {
  label: "Dribble",
  chance: 0.03,
  style: "bounce",
  values: {
    // for ms (ownMs on its own bar) the bar runs speed times as fast for the
    // first `share` of every beatMs beat
    speed: 3,
    beatMs: 700,
    share: 0.35,
    ms: 12_000,
    ownMs: 24_000,
  },
} satisfies CritMeta;
