import type { CritMeta } from "../../../critKit/meta";

// the lock sucking in wisps from all round the locked floor, quicker and
// quicker, until it bursts open and blows them onto the new bar
export default {
  label: "Deep Breath",
  chance: 0.03,
  style: "pull",
  // levels on the opened floor, times the crit's multiple
  values: { levels: 1 },
} satisfies CritMeta;
