import type { EventMeta } from "../../eventMeta";

// the screen bursts apart in tiles and slams back
export default {
  label: "Exploded View",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    pulseGapMs: [420, 340] as [number, number], // between jolts apart
    openMs: 250, // held wide open before slamming back
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
