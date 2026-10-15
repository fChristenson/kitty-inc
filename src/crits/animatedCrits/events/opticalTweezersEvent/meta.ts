import type { EventMeta } from "../../eventMeta";

// three crossing beams trap beads one by one and haul them onto the workers
export default {
  label: "Optical Tweezers",
  style: "beam",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    growMs: 300, // the beads spat up and the beams blazing in
    carryMs: 1700, // every dart and haul, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
