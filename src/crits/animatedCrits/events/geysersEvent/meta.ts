import type { EventMeta } from "../../eventMeta";

// wisps along the bottom erupt geysers of cash
export default {
  label: "Geysers",
  chance: 0.01,
  values: {
    leadMs: 300, // the wisps popping up before the first eruption
    gapMs: 200, // between eruptions
    streamMs: 550, // how long each erupts
    travelMs: 700, // each coin's trip up a geyser and over
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
