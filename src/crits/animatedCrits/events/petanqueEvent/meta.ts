import type { EventMeta } from "../../eventMeta";

// boules lobbed round a jack under the lock, the last one knocking the
// closest into the lock
export default {
  label: "Pétanque",
  style: "bounce",
  reward: "a free floor",
  chance: 0.01,
  values: {
    lobMs: 420, // each lob up to the lock
    gapMs: 260, // between throws
    rollMs: 300, // a boule's bounces on to a stop
    knockMs: 260, // the knocked boule's hop into the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
