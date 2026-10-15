import type { CritMeta } from "../../../critKit/meta";

// a wisp leading a river of coins into a pool held behind a gate of light
// above the locked floor, yanking the gate open in quickening tugs until it
// bursts and the flood crashes down onto the lock, pounding it open: each of
// the new floor's next taps also pays out the two floors below it
export default {
  label: "Floodgate",
  chance: 0.03,
  style: "mix",
  // flood taps on the opened floor's button
  values: { taps: 4 },
} satisfies CritMeta;
