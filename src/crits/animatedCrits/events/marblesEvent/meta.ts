import type { EventMeta } from "../../eventMeta";

// a shooter marble knocks marbles out of a glitter ring onto the empty spots
export default {
  label: "Marbles",
  style: "bounce",
  reward: "free hires",
  chance: 0.01,
  values: {
    growMs: 250, // the ring and marbles appearing
    shotMs: 220, // each flick, quickening
    pauseMs: 140, // rolling to a stop before the next flick
    knockMs: 160, // a knocked marble skidding to the ring's edge
    dropMs: 380, // its arc onto its spot
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
