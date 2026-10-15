import type { CritMeta } from "../../../critKit/meta";

// twin rings open side by side on the dark locked floor's lock; a wisp dives
// into one, bursts out of the other and loops round into the first again,
// quicker and tighter every turn like a revolving door, more wisps joining,
// till the spin flings them all into the lock and bursts it open; they stream
// into the new floor's button, leaving free taps on the crit's own floor
export default {
  label: "Revolving Door",
  chance: 0.03,
  style: "portal",
  // free taps on the upgrade button of the crit's own floor
  values: { taps: 6 },
} satisfies CritMeta;
