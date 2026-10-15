import type { EventMeta } from "../../eventMeta";

// two racers launch off the button and hairpin round the clicked bar's far
// end onto it
export default {
  label: "Le Mans",
  style: "race",
  reward: "levels",
  chance: 0.01,
  values: {
    raceMs: 1300, // the leader's race, from a standstill
    gapMs: 120, // the chaser behind it
    levelShare: 0.05, // the leader's; the chaser lands twice as many
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
