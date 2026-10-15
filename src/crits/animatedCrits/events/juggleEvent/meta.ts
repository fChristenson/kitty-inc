import type { EventMeta } from "../../eventMeta";

// the rare "Juggle" event: three wisps juggled round a figure of eight, ever
// faster and higher, each catch tossing coins, until all three are hurled up
// into one blast
export default {
  label: "Juggle",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    beatMs: [200, 95] as [number, number], // between throws, quickening
    riseMs: 300, // after the last beat, the balls hurled up to meet
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
