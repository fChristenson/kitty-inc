import type { EventMeta } from "../../eventMeta";

// two corner guns keep a bomb wisp in the air, every hit a blast knocking it
// higher and across, then riddle it over its bar till it blows
export default {
  label: "Air Juggle",
  style: "gunfire",
  reward: "levels + crit tier",
  chance: 0.01,
  values: {
    tossMs: 340, // the toss up off the clicked bar
    dropMs: 260, // the drop back over it after the last knock
    levelShare: 0.006, // levels per knock, on the bar under it
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
