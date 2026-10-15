import type { EventMeta } from "../../eventMeta";

// the rare "Tag" event: a big wisp chases a small one darting round the
// screen, ever faster, knocking coins loose, and catches it on the button in
// a huge blast
export default {
  label: "Tag",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    dodgeMs: [300, 130] as [number, number], // each dart, quickening
    lagMs: 300, // how far behind the chaser starts, closing to nothing
    holdMs: 500, // after the catch, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
