import type { CritMeta } from "../../../critKit/meta";

// a tilted disk of stars beside the readouts clumping into one comet per bar,
// each whipping round the core faster and faster, flung off one by one onto
// its readout: the bar shoots off fast, slowing a step with every payout
export default {
  label: "Comet Tails",
  chance: 0.03,
  style: "galaxy",
  // how many times as fast a bar runs at first, tapering evenly towards
  // normal over its next payouts (its own over ownPayouts)
  values: { speed: 4, payouts: 6, ownPayouts: 12 },
  isNew: true,
} satisfies CritMeta;
