import type { CritMeta } from "../../../critKit/meta";

// lit bombs on every readout and a powder trail between them: a spark races
// down it, each bomb blowing bigger than the last, each bar running faster
// the further down the chain it was
export default {
  label: "Powder Trail",
  chance: 0.03,
  style: "explosion",
  values: {
    // for ms a bar runs 1 + its place in the chain times as fast (the first
    // x2), up to maxSpeed; its own bar maxSpeed
    ms: 6000,
    maxSpeed: 6,
  },
} satisfies CritMeta;
