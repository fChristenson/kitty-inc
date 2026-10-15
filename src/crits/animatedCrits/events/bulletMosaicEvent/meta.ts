import type { EventMeta } from "../../eventMeta";

// two guns stud a giant star of bullets over the clicked bar, which slams
// onto it
export default {
  label: "Bullet Mosaic",
  style: "gunfire",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    growMs: 250, // the guns rising
    fireMs: 1300, // every stud shot in, quickening
    blazeMs: 250, // the finished star blazing
    slamMs: 160, // the star slamming onto the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
