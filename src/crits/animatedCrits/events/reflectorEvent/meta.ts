import type { EventMeta } from "../../eventMeta";

// a beam bounces mirror to mirror
export default {
  label: "Reflector",
  style: "beam",
  chance: 0.01,
  values: {
    popMs: 260, // the mirrors popping up
    aimMs: 260, // the aim laser flickering
    legsMs: [240, 120] as [number, number], // each leg of the beam, quickening
    streamMs: 380, // cash pouring down each leg
    travelMs: 260, // each coin's trip down a leg
    holdMs: 350,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
