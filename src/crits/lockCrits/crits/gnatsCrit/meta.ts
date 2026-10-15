import type { CritMeta } from "../../../critKit/meta";

// a flock of glitter filling the locked floor, battering the lock in waves
// until it packs into a ball that bursts it open: the new floor levelled
export default {
  label: "Gnats",
  chance: 0.03,
  style: "swarm",
  // levels on the opened floor per multiple of the crit
  values: { levels: 4 },
} satisfies CritMeta;
