import type { CritMeta } from "../../../critKit/meta";

// two spinning galaxies racing together across the locked floor and
// smashing into each other on the lock, stars flung onto the new bar
export default {
  label: "Star Crash",
  chance: 0.03,
  style: "galaxy",
  // levels on the opened floor, times the crit's multiple
  values: { levels: 1 },
} satisfies CritMeta;
