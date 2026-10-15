import type { EventMeta } from "../../eventMeta";

// a river of cash spins up a turbine that flings blades onto the empty spots
export default {
  label: "Turbine",
  style: "mix",
  reward: "free hires + cash",
  chance: 0.01,
  values: {
    feedMs: 450, // the river reaching the hub
    spinMs: 1000, // spinning up
    flyMs: 360, // each blade's flight onto its spot
    riseMs: 280, // the hub rising into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
