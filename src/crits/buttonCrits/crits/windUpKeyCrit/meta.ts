import type { CritMeta } from "../../../critKit/meta";

// a clockwork key of light beside every button wound click by click until
// it spins free and bursts into its button: each of its next taps also
// boosts every worker on the open floors just above and below the tapped one
export default {
  label: "Wind-Up Key",
  chance: 0.03,
  style: "charge",
  // wind taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
