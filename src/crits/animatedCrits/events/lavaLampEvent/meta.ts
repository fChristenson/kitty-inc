import type { EventMeta } from "../../eventMeta";

// blobs of cash rise like lava-lamp wax
export default {
  label: "Lava Lamp",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    pourMs: 400, // the blobs pouring in
    gapsMs: [180, 70] as [number, number], // between blobs rising, quickening
    riseMs: 450, // each blob's climb
    joinMs: 300, // the blobs oozing together
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
