import type { EventMeta } from "../../eventMeta";

// swarms of rocket wisps evolve by a genetic algorithm to fly round a beam
// into the total
export default {
  label: "Smart Rockets",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    growMs: 250, // the beam slamming across
    flyMs: 480, // each swarm's flight (later ones quicker)
    gapMs: 80, // between swarms
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
