import type { EventMeta } from "../../eventMeta";

// the button erupts a fountain of cash and lobs lava bombs of it across the
// screen
export default {
  label: "Volcano",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    eruptMs: 900, // the fountain roaring
    bombGapsMs: [240, 140] as [number, number], // between bombs, quickening
    lobMs: 420, // each bomb's flight
    flightMs: 380, // each coin's surge into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
