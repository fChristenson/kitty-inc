import type { EventMeta } from "../../eventMeta";

// the rare "Drumroll" event: two wisps beat a big gold drum into a blurring
// drumroll, coins bouncing off it, then slam down together and burst it, and
// the coins sweep into the total
export default {
  label: "Drumroll",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    firstTapMs: 250, // the drum popping up and the sticks dropping in
    gapMs: [130, 35] as [number, number], // between taps, quickening
    finalMs: 450, // the sticks rising, hanging and slamming down together
    holdMs: 450, // after the slam, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
