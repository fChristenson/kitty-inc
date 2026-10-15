import type { EventMeta } from "../../eventMeta";

// the rare "Jackhammer" event: the wisp jackhammers the button ever faster,
// popping coins, then blows apart on it spraying coins over the screen into
// the total
export default {
  label: "Jackhammer",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    hammerMs: 1_100, // the taps speeding up to a frenzy
    holdMs: 450, // the coins hanging after the blast
    mergeMs: 500,
  },
} as const satisfies EventMeta;
