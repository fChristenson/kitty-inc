import type { EventMeta } from "../../eventMeta";

// two gravity holes spiral in round each other gulping the glitter, merge and
// sink onto the clicked bar
export default {
  label: "Black Hole Merger",
  style: "clutter",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    rippleMs: 400, // the glitter rippling out in rings
    spiralMs: 1300, // the holes spiralling in
    sinkMs: 260, // the merged hole sinking onto the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
