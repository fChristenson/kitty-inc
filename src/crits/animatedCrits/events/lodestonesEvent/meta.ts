import type { EventMeta } from "../../eventMeta";

// two gold poles light up on the frozen screen and the glitter all over it
// snaps onto them into spiky crusts, quicker and quicker; they yank together
// and slam, then repel, wisps flung off onto every empty spot in view, each a
// new worker
export default {
  label: "Lodestones",
  style: "pull",
  reward: "hires",
  chance: 0.01,
  values: {
    pullMs: 1100, // from the click till the last speck snaps on and the poles yank together
    slamMs: 240, // the poles yanked together
    hireMs: 360, // from the slam till the first hire lands
    hireGapMs: 70, // between the hires landing
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
