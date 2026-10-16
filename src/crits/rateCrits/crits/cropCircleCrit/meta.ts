import type { CritMeta } from "../../../critKit/meta";

// a glowing saucer skimming down the bars, pressing a crop circle out under
// every readout in one fast spin, each erupting in a pillar of light; over
// its own it presses the biggest of all, erupting in the tallest: each bar's
// next payouts reap its whole building, paying more for every open floor
export default {
  label: "Crop Circle",
  chance: 0.03,
  style: "summon",
  // the next `payouts` payouts (`ownPayouts` on its own bar) each pay 1 +
  // `perFloor` per open floor of its building, at most x`max`
  values: { payouts: 4, ownPayouts: 8, perFloor: 0.15, max: 4 },
} satisfies CritMeta;
