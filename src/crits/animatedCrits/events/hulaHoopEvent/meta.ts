import type { EventMeta } from "../../eventMeta";

// a hoop of wisps whirls round the workers
export default {
  label: "Hula Hoop",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    dropMs: 260, // the hoop dropping in
    spinsMs: [380, 200] as [number, number], // each whirl, quickening
    hopMs: 180, // sailing to the next worker
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
