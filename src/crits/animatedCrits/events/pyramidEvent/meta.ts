import type { EventMeta } from "../../eventMeta";

// wisps stack into a pyramid, then spring onto the spots
export default {
  label: "Pyramid",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    climbMs: 110, // between vaults onto the pyramid
    vaultMs: 260,
    teeterMs: 320,
    flingGapMs: 110,
    flingMs: 340,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
