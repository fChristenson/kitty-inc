import type { CritMeta } from "../../../critKit/meta";

// a ring of lit bombs round the locked floor blowing in a chain, then a
// cluster bomb on the lock: its button charged with levels
export default {
  label: "Blast Radius",
  chance: 0.03,
  style: "explosion",
  // levels the opened floor's next tap lands, per multiple of the crit
  values: { levels: 5 },
} satisfies CritMeta;
