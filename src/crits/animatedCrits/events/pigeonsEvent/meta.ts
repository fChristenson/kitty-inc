import type { EventMeta } from "../../eventMeta";

// a flock perches, then bursts into flight
export default {
  label: "Pigeons",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    flutterMs: 700, // the flock fluttering down
    perchMs: 350, // the flock perched
    flyMs: 450, // each bird's flight to the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
