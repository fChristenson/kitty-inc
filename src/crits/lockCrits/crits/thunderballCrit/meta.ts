import type { CritMeta } from "../../../critKit/meta";

// a ball of lightning ricocheting wall to wall across the locked floor,
// cracking down onto the lock every pass, then slamming in and bursting it
// open: each of the new floor's next taps also pays out a random floor
export default {
  label: "Thunderball",
  chance: 0.03,
  style: "lightning",
  // striking taps on the opened floor's button
  values: { taps: 4 },
} satisfies CritMeta;
