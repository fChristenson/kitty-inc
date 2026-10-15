import type { EventMeta } from "../../eventMeta";

// guns along the bottom fill the sky with flak bursts of cash
export default {
  label: "Flak Barrage",
  style: "gunfire",
  reward: "cash",
  chance: 0.01,
  values: {
    plantMs: 300, // the guns planting
    fireMs: 1_100, // the barrage
    firesMs: [90, 35] as [number, number], // between shots, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
