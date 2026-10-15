import type { CritMeta } from "../../../critKit/meta";

// a popper bang showers gold and coloured confetti over every bar; a glowing
// sweep herds each bar's mess into a pile on its readout that pops, stroke
// after quickening stroke, then its own swirls into one big pile and bursts:
// every bar it piled on runs faster for every pile swept in the run
export default {
  label: "Confetti Sweep",
  chance: 0.03,
  style: "clutter",
  // each swept bar running 1 + `perPile` times as fast per pile swept in the
  // run (its own counting `ownPiles`), at most `max`, for `ms` (`ownMs` on
  // its own)
  values: { perPile: 0.3, ownPiles: 2, max: 3.5, ms: 15000, ownMs: 25000 },
} satisfies CritMeta;
