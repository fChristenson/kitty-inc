import type { EventMeta } from "../../eventMeta";

// wisps career round like bumper cars
export default {
  label: "Bumper Cars",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    driveMs: 1_700, // the bumping, speeding up
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
