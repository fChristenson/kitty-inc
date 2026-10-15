import type { EventMeta } from "../../eventMeta";

// a rogue star knocks comets out of a halo; they whip round the sun and fling
// onto the workers
export default {
  label: "Oort Cloud",
  style: "galaxy",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    growMs: 350, // the halo and the sun flaring up
    passMs: 600, // the rogue star streaking across the halo
    plungeMs: 450, // each knocked comet sliding onto its plunging orbit
    whipMs: 380, // whipping round the sun before breaking orbit
    gapMs: 110, // between the workers' comets breaking orbit
    flyMs: 320, // each comet's arc onto its worker
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
