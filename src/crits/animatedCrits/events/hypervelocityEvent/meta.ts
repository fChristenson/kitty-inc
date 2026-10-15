import type { EventMeta } from "../../eventMeta";

// stars sink onto a galaxy's binary core and are slung out onto the bars
export default {
  label: "Hypervelocity",
  style: "galaxy",
  reward: "levels",
  chance: 0.01,
  values: {
    growMs: 250, // the galaxy swirling up
    sinkMs: 500, // each runner sinking onto the binary
    gapMs: 230, // between slings, quickening
    flyMs: 300, // each flung star's flight onto its bar
    levelShare: 0.012, // levels per hit
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
