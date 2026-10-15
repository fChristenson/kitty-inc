import type { EventMeta } from "../../eventMeta";

// a gravity hole gulps a checkerboard of glitter in, then sinks onto the
// clicked bar
export default {
  label: "Sinkhole",
  style: "clutter",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    spillMs: 380, // the glitter blown out over the screen
    gulpMs: 260, // each gulp (the last runs twice as long)
    gapMs: 140, // between gulps
    sinkMs: 280, // the hole sinking onto the bar
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
