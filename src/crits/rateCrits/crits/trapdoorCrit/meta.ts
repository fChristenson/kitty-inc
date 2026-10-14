import type { CritMeta } from "../../../critKit/meta";

// a wisp dropping through every bar's readout into a ring under the
// building, out of its twin over the next bar, faster each fall: each
// bar pays more for a while
export default {
  label: "Trapdoor",
  chance: 0.03,
  style: "portal",
  // how many times as much a bar pays, for how long (ms; its own ownMs)
  values: { payout: 2, ms: 30_000, ownMs: 60_000 },
} satisfies CritMeta;
