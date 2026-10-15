import type { EventMeta } from "../../eventMeta";

// particles fired through two slits pile up in interference fringes on the
// bars
export default {
  label: "Double Slit",
  style: "experiment",
  reward: "levels",
  chance: 0.01,
  values: {
    setupMs: 250, // the slit wall snapping up
    emitMs: 1300, // every particle fired, quickening
    flyMs: 240, // each particle's flight through a slit onto the screen
    blazeMs: 200, // the finished pattern to the first fringe blazing
    smearMs: 260, // each fringe smearing along its bar
    gapMs: 110, // between fringes
    levelShare: 0.04, // levels per bar (twice on the clicked one)
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
