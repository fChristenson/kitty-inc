import type { EventMeta } from "../../eventMeta";

// the button shoots ball wisps through rims of light over the empty spots, a
// worker forming where each lands
export default {
  label: "Free Throws",
  style: "bounce",
  reward: "free hires",
  chance: 0.01,
  values: {
    growMs: 250, // the rims popping up
    shotMs: 520, // each shot's flight to its rim
    gapMs: 260, // between shots
    dropMs: 200, // dropping through onto the spot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
