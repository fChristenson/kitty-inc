import type { EventMeta } from "../../eventMeta";

// wisps hide behind the workers and a seeker hunts them down
export default {
  label: "Hide and Seek",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    hideMs: 300, // the hiders scattering
    countMs: 450, // the seeker counting down on the button
    dashesMs: [300, 160] as [number, number], // each dash to a hider, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
