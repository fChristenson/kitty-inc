import type { EventMeta } from "../../eventMeta";

// a side-scrolling run over the floors' bars laid end to end as platforms,
// every landing a level, off a ramp into a huge blast
export default {
  label: "Geometry Run",
  style: "reveal stage (auto-runner)",
  reward: "levels + crit tier",
  chance: 0.01,
  values: {
    speed: 0.00136, // stage widths a ms
    hopMs: 300, // a hop onto the next platform
    spikeHopMs: 220, // a hop over a platform's spike
    launchMs: 240, // up the ramp into the finale
    holdMs: 600, // the finale's blast before the stage whips out
  },
} as const satisfies EventMeta;
