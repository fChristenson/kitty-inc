import type { CritMeta } from "../../../critKit/meta";

// a giant magic circle under its own readout, a small one under every other,
// each threaded to the big one; they whip round together, the small ones
// erupting in turn, then the big one: every bar it landed on runs as fast as
// the fastest of them for a while
export default {
  label: "Ritual",
  chance: 0.03,
  style: "summon",
  // each bar matching the fastest bar landed on (at least x`min`) for `ms`
  // (`ownMs` on its own bar)
  values: { ms: 10000, ownMs: 15000, min: 1.5 },
} satisfies CritMeta;
