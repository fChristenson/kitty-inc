import type { EventMeta } from "../../eventMeta";

// the cash runs backwards into the button, then plays back out
export default {
  label: "Rewind",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    rewindMs: 800, // the cash rewinding
    pauseMs: 250, // the button swelling
    playMs: 380, // each coin's flight back out
    spreadMs: 250, // the coins leaving
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
