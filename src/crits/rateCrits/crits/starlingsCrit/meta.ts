import type { CritMeta } from "../../../critKit/meta";

// a long ribbon of a flock streaming through every bar's readout, a wave
// peeling into each: each bar pays half as much again for a while
export default {
  label: "Starlings",
  chance: 0.03,
  style: "swarm",
  // how many times as much a bar pays, for how long (ms; its own ownMs)
  values: { payout: 1.5, ms: 45_000, ownMs: 90_000 },
} satisfies CritMeta;
