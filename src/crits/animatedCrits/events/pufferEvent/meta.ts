import type { EventMeta } from "../../eventMeta";

// a puffer gulps rivers of cash and spikes
export default {
  label: "Puffer",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    gulpMs: 800, // the gulping, swelling
    spikeMs: 450, // the spikes' trip out
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
