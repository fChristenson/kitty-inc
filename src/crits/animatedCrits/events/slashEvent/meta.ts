import type { EventMeta } from "../../eventMeta";

// the rare "Slash" event: three fast cuts rip across the screen, smoulder,
// then burst open blasting coins into the total
export default {
  label: "Slash",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    slashMs: 110, // each cut streaking across
    gapMs: 170, // between cuts
    smoulderMs: 300, // the cuts glowing ever brighter before they burst
    holdMs: 500, // the coins hanging after the burst
    mergeMs: 500,
  },
} as const satisfies EventMeta;
