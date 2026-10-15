import type { EventMeta } from "../../eventMeta";

// a ring of bombs round the lock blows the glitter mess in onto it, which
// blows it open
export default {
  label: "Blast Sweep",
  style: "clutter",
  reward: "a free floor",
  chance: 0.01,
  values: {
    spillMs: 420, // the glitter flung out over the screen
    fuseMs: 320, // the bombs' fuses fizzing before the first blast
    blastsMs: 1050, // every bomb blowing round the ring, quickening
    implodeMs: 420, // the mess drawn in onto the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
