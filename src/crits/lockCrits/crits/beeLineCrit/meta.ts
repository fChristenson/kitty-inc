import type { CritMeta } from "../../../critKit/meta";

// a ribbon of a swarm racing figure eights through the locked floor's lock,
// faster and faster, then a dead straight beeline into it that bursts it
// open: each of the new floor's next taps also hires on the floor below it
export default {
  label: "Bee Line",
  chance: 0.03,
  style: "swarm",
  // hiring taps on the opened floor's button
  values: { taps: 4 },
} satisfies CritMeta;
