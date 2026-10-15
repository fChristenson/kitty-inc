import type { EventMeta } from "../../eventMeta";

// wisps pour from the clicked button into a glitter drum and tumble; one by
// one, quicker each, a wisp is drawn out of the top onto a bar with levels;
// then the drum bursts and the rest pour onto the clicked bar, a crit tier up
export default {
  label: "Lotto Drum",
  style: "wisp",
  reward: "levels + crit tier",
  chance: 0.01,
  values: {
    firstDrawMs: 750, // from the click to the first wisp drawn out
    draws: 8, // wisps drawn out one by one before the drum bursts
    flyMs: 280, // a drawn wisp's flight out of the drum onto its bar
    pourGapMs: 45, // between the wisps pouring onto the clicked bar
    levelShare: 0.002, // levels a drawn wisp lands on its bar
    winnerShare: 0.008, // levels the last pour lands on the clicked bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
