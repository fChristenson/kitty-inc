import type { EventMeta } from "../../eventMeta";

// a beam cuts a disc out of the screen
export default {
  label: "Cookie Cutter",
  style: "beam",
  chance: 0.01,
  values: {
    aimMs: 240, // the aim laser flickering
    cutMs: 900, // the beam cutting round
    liftMs: 380, // the disc flying into the total
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
