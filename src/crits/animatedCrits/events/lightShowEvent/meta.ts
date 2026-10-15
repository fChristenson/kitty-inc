import type { EventMeta } from "../../eventMeta";

// emitters along the bottom put on a concert laser show
export default {
  label: "Light Show",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    beatsMs: [200, 480, 730, 950, 1_150, 1_330], // each change; the last locks on the total
    lockMs: 260, // the beams burning into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
