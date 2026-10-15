import type { CritMeta } from "../../../critKit/meta";

// a ball of light bouncing on the lock, higher and harder each time, until
// it plunges from the sky and bursts the floor open, then hops onto its
// button: its next taps roll crits more often
export default {
  label: "Super Ball",
  chance: 0.03,
  style: "bounce",
  // hot taps on the opened floor's button
  values: { taps: 4 },
} satisfies CritMeta;
