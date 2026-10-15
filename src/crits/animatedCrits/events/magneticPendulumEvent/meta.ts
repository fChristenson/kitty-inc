import type { EventMeta } from "../../eventMeta";

// a pendulum wisp swings chaotically between magnets over the empty spots
export default {
  label: "Magnetic Pendulum",
  style: "wisp",
  reward: "free hires",
  chance: 0.01,
  values: {
    swingMs: 2000, // the chaotic swing
    settleMs: 220, // caught on its magnet
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
