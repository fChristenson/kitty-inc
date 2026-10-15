import type { EventMeta } from "../../eventMeta";

// a nozzle spirals out spraying a cloud of gold mist that spins up into a
// disk, clumps into stars and flings them onto the bars
export default {
  label: "Nebula",
  style: "spray + galaxy",
  reward: "levels + crit tier",
  chance: 0.01,
  values: {
    sprayMs: 700, // the nozzle spiralling out
    igniteMs: 600, // the stars igniting, quicker and quicker
    levelShare: 0.004, // levels per star landing on a bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
