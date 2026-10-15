import type { EventMeta } from "../../eventMeta";

// two racing wisps take a hairpin round the clicked button, then dash into
// the total
export default {
  label: "Curves",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    raceMs: 900, // the leader's run: flat out in, braking round the button's end, powering out into the total
    gapMs: 120, // the chaser on its tail, slamming in after it
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
