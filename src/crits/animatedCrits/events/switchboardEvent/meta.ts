import type { EventMeta } from "../../eventMeta";

// sparks plug live cords from the button into the workers
export default {
  label: "Switchboard",
  style: "lightning",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    runsMs: [300, 160] as [number, number], // each spark's run, quickening
    surgeAfterMs: 200, // the last plug to the surge
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
