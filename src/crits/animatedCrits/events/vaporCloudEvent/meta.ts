import type { EventMeta } from "../../eventMeta";

// a cloud of glittering fuel spreads over the screen and a spark detonates it
export default {
  label: "Vapor Cloud",
  style: "explosion",
  reward: "cash",
  chance: 0.01,
  values: {
    spreadMs: 650, // the cloud spreading
    frontMs: 700, // the detonation front crossing it
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
