import type { EventMeta } from "../../eventMeta";

// two shearing currents of cash roll up into curling billows that peel off
// into the total
export default {
  label: "Billows",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    floodMs: 400, // the currents flooding in
    rollMs: 1100, // the billows winding up
    peelMs: 450, // the billows peeling off one after another
    riseMs: 320, // each coin's rise into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
