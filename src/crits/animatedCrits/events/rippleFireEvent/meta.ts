import type { EventMeta } from "../../eventMeta";

// a row of guns ripple-fires into the clicked bar, then volleys all at once
export default {
  label: "Ripple Fire",
  style: "gunfire",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    readyMs: 200, // before the first shot
    rippleMs: [70, 35] as [number, number], // between shots of a pass, quickening
    passGapMs: 140, // between passes
    speed: 2.2, // px per ms
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
