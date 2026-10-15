import type { EventMeta } from "../../eventMeta";

// bombs round the screen's edge go off in a chain into the locked floor
export default {
  label: "Daisy Chain",
  style: "explosion",
  reward: "unlock",
  chance: 0.01,
  values: {
    scatterMs: 500, // the bombs scattering round the edge
    chainMs: [1_300, 700] as [number, number], // the chain round the edge, quickening
    leapMs: 300, // the last leap into the floor
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
