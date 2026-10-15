import type { EventMeta } from "../../eventMeta";

// an airbrush rasters a giant gem out of the mist, which shatters onto the
// bars
export default {
  label: "Stencil",
  style: "spray",
  reward: "levels",
  chance: 0.01,
  values: {
    sprayMs: 1200, // every pass, quickening
    blazeMs: 200, // the finished gem blazing
    shatterMs: 380, // each tile's arc onto its bar
    levelShare: 0.03, // levels per bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
