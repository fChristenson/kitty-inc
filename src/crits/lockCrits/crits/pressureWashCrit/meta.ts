import type { CritMeta } from "../../../critKit/meta";

// two nozzles blasting gold at the lock in harder and harder bursts until it
// gives, then washing the new bar: it pays double for a while
export default {
  label: "Pressure Wash",
  chance: 0.03,
  style: "spray",
  // how many times as much the opened floor's bar pays, for how long (ms)
  values: { payout: 2, ms: 60_000 },
} satisfies CritMeta;
