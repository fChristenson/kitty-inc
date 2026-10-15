import type { EventMeta } from "../../eventMeta";

// the rare "Halo" event: glimmer lights orbit the lowest-tier worker in view
// and settle as a halo on its head, which jumps straight to the top perma
// tier
export default {
  label: "Halo",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    gatherMs: 800, // the lights spiralling in to orbit the worker
    orbitMs: 200, // circling it
    settleMs: 600, // shrinking into the halo
    holdMs: 900, // the halo glowing before the screen unfreezes
  },
} as const satisfies EventMeta;
