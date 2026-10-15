import type { CritMeta } from "../../../critKit/meta";

// a heavy dark-gold point opens beside its own bar and drags the glow and
// glitter off every readout into it, swells, collapses and bursts, flinging
// golden lumps back: the bar's payouts get heavier the slower it runs
export default {
  label: "Gravity Pull",
  chance: 0.03,
  style: "pull",
  // for `ms` (`ownMs` on its own bar) each payout x(`k` / the bar's speed
  // factor), kept within `min`..`max`
  values: { ms: 15000, ownMs: 25000, min: 1.5, max: 4, k: 6 },
  isNew: true,
} satisfies CritMeta;
