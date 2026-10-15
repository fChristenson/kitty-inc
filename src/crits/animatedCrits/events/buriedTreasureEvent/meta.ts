import type { EventMeta } from "../../eventMeta";

// a digger follows a trail to treasure that gushes cash
export default {
  label: "Buried Treasure",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    walkMs: 900, // the walk along the trail
    digsMs: [300, 200] as [number, number], // between digs, quickening
    gushMs: 500, // the treasure gushing
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
