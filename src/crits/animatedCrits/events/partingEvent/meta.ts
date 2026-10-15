import type { EventMeta } from "../../eventMeta";

// a sea of cash parts into towering walls that crash back into a geyser
export default {
  label: "Parting",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    floodMs: 500, // the sea rising
    partMs: 450, // parting into two walls
    standMs: 380, // the walls standing, trembling
    crashMs: 200, // slamming back together
    spoutMs: 320, // the geyser's coins leaving, top first
    leapMs: 380, // each one's leap into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
