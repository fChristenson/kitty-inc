import type { EventMeta } from "../../eventMeta";

// a dragster revs and races the bottom
export default {
  label: "Dragster",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    revMs: 480, // revving at the line
    thirdsMs: [380, 200] as [number, number], // each third of the run, quickening
    chuteMs: 260, // the parachute blooming
    whipMs: 420, // the tail whipping into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
