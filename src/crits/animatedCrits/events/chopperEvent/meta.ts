import type { EventMeta } from "../../eventMeta";

// a rotor of beams lifts off the button and hovers over each empty spot,
// setting down a worker
export default {
  label: "Chopper",
  style: "beam",
  reward: "free hires",
  chance: 0.01,
  values: {
    spinUpMs: 380, // the rotor spinning up
    flyMs: [300, 200] as [number, number], // each hop to a spot, quickening
    hoverMs: 220, // hovering over each spot
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
