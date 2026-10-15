import type { EventMeta } from "../../eventMeta";

// a broom sweeps blown dust into a line, then into a bunny per worker
export default {
  label: "Dust Bunnies",
  style: "clutter",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    blowMs: 450, // the gust blowing the dust in
    dragMs: 110, // each broom stroke
    liftMs: 50, // swinging to the next stroke
    gatherMs: 150, // the bunnies settling
    hopMs: 340, // each bunny's hop onto its worker
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
