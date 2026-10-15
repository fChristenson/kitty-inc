import type { EventMeta } from "../../eventMeta";

// the view pulls back, a wisp rockets up and blows the building's top open;
// new floors slam down out of the sky onto it one by one, quicker each, the
// last the hardest
export default {
  label: "Raise the Roof",
  style: "explosion",
  reward: "free floors",
  chance: 0.01,
  values: {
    floors: 3, // new floors, at most
    zoomMs: 320, // the view pulling back
    blowMs: 460, // the rocket reaching the top
    dropMs: 220, // a floor's fall
    landsMs: [780, 1020, 1220] as number[], // each floor landing
    holdMs: 600,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
