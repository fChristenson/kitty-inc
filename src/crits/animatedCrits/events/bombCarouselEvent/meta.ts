import type { EventMeta } from "../../eventMeta";

// a whirling ring of bombs flings out across the screen
export default {
  label: "Bomb Carousel",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    spinMs: 900, // the ring spinning up
    flingMs: 300, // each bomb's fling
    releasesMs: 600, // the ring letting go round
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
