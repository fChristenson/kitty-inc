import type { EventMeta } from "../../eventMeta";

// the rare "Seesaw" event: two wisps catapult each other ever higher off a
// gold seesaw, coins flung at every landing, until the last rockets the other
// off the top in a huge blast
export default {
  label: "Seesaw",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    introMs: 320, // the seesaw popping up and the first wisp dropping in
    flightMs: [300, 400] as [number, number], // each launch up and back down, growing
    flipMs: 90, // the plank snapping over on each landing
    holdMs: 500, // after the last landing, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
