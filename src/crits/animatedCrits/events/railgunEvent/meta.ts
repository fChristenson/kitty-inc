import type { EventMeta } from "../../eventMeta";

// rails build up and fire a slug of cash
export default {
  label: "Railgun",
  style: "beam",
  reward: "cash",
  chance: 0.01,
  values: {
    buildsMs: [220, 110] as [number, number], // each section, quickening
    chargeMs: 350, // crackling before it fires
    fireMs: 160, // the slug's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
