import type { EventMeta } from "../../eventMeta";

// two racers hairpin round the top bar, pit under the button for cash and
// launch into the total
export default {
  label: "Pit Stop",
  style: "race",
  reward: "cash",
  chance: 0.01,
  values: {
    raceMs: 1500, // the race, not counting the pit stop
    gapMs: 120, // the chaser behind the leader
    pitMs: 380, // stopped dead in the pit, refuelling
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
