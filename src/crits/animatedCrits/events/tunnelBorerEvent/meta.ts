import type { EventMeta } from "../../eventMeta";

// a drill bores in through the outer wall and on into the lock
export default {
  label: "Tunnel Borer",
  style: "drill",
  reward: "a free floor",
  chance: 0.01,
  values: {
    approachMs: 260, // the drill screaming in
    stallMs: 750, // grinding in place against the wall
    boreMs: 1500, // boring through once it gives
    exitMs: 220, // rocketing across the floor into the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
