import type { EventMeta } from "../../eventMeta";

// scatter wisps fly out of the clicked button one by one onto bars; the third
// hovers high over its bar, flaring, the screen rumbling, then drops: beams
// link all three and every bar blows in a rolling chain, the clicked one last
// a crit tier up
export default {
  label: "Third Scatter",
  style: "explosion",
  reward: "levels + crit tier",
  chance: 0.01,
  values: {
    landsMs: [450, 750, 1650], // each scatter landing
    hoverMs: 500, // the third hovering over its bar before it drops
    linkMs: 120, // from the third landing to the beams linking them
    levelShare: 0.006, // levels per bar as its chain blows
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
