import type { EventMeta } from "../../eventMeta";

// stars of light and cash streak out at light speed, then snap back and fire
// into the total
export default {
  label: "Hyperspace",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    chargeMs: 400, // stars drifting out before the jump
    warpMs: 900, // streaking, ever faster
    dropMs: 200, // every streak snapping back into the button
    fireMs: 280, // the beam into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
