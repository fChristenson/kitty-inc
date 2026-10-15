import type { EventMeta } from "../../eventMeta";

// a wisp blows bubbles of cash that pop into new workers
export default {
  label: "Bubble Wand",
  style: "mix",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    riseMs: 220, // the wand floating up
    gapsMs: [300, 180] as [number, number], // between bubbles, quickening
    inflateMs: 240, // each bubble swelling out of the wand
    floatMs: 380, // each bubble drifting to its spot
    popMs: 260, // the cash flung out of a pop
    diveMs: 280, // the wand diving into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
