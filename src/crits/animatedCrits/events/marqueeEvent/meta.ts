import type { EventMeta } from "../../eventMeta";

// a light chases round a ring of bulb wisps
export default {
  label: "Marquee",
  style: "wisp",
  chance: 0.01,
  values: {
    chaseMs: 1_300, // the light chasing round, speeding up
    blazeMs: 200, // every bulb blazing before they fire
    fireMs: 280, // each bulb's flight into the total
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
