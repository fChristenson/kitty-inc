import type { EventMeta } from "../../eventMeta";

// three balls pinball off the bars
export default {
  label: "Multiball",
  style: "wisp",
  reward: "levels",
  chance: 0.01,
  values: {
    playMs: 1_500, // pinballing round the screen
    slamMs: 200, // all three diving into the clicked floor's bar
    levelShare: 0.03, // of a bar's levels, per bounce
    holdMs: 700,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
