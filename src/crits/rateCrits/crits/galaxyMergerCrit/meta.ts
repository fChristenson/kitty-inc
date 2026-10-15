import type { CritMeta } from "../../../critKit/meta";

// two tilted star disks spiralling into each other beside the readouts, each
// close pass tearing tidal arms off onto the bars' readouts, the cores
// colliding and the merged disk flinging its stars onto its own: the bar's
// next payouts each also pay out the bar next to it
export default {
  label: "Galaxy Merger",
  chance: 0.03,
  style: "galaxy",
  // how many of a bar's next payouts merge in its neighbour's (its own:
  // ownPayouts)
  values: { payouts: 4, ownPayouts: 8 },
} satisfies CritMeta;
