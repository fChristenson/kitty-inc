import type { CritMeta } from "../../../critKit/meta";

// a drop lands on the top readout, its ring spilling off the bar's end and
// dripping onto the bar below, on down the building in a quickening cascade;
// then one huge drop plunges onto its own: every payout of each bar ripples
// down, doubling the next payout of the open floor below it
export default {
  label: "Ripple Effect",
  chance: 0.03,
  style: "ripple",
  // for `ms` each payout of a rewarded bar makes the next payout of the open
  // floor below it (the ground floor: the one above) `bonus` times as big
  values: { ms: 15000, bonus: 2 },
} satisfies CritMeta;
