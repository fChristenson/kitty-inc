import type { CritMeta } from "../../../critKit/meta";

// the number diving into a ring beside the flash and bursting out of its twin
// right on the lock, slamming it again and again, quicker every pass, the
// twin splitting more wisps out each time, till they smash it open and stream
// back through the rings into the new floor's button: each of its next taps
// also hires a worker on the crit's own floor
export default {
  label: "Door to Door",
  chance: 0.03,
  style: "portal",
  // hiring taps on the opened floor's button
  values: { taps: 5 },
} satisfies CritMeta;
