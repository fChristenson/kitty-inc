import type { EventMeta } from "../../eventMeta";

// the screen switches off like an old TV and pops
export default {
  label: "Switch Off",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    squashMs: 220,
    shrinkMs: 160,
    swellMs: 220,
    onMs: 240,
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
