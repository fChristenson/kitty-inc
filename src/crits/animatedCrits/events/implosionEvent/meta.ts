import type { EventMeta } from "../../eventMeta";

// the rare "Implosion" event: rings of wisps collapse onto the button from
// beyond the screen, ever faster, swelling its core, until a last ring blows
// it in a huge blast
export default {
  label: "Implosion",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    firstRingMs: 450, // the first ring's slam
    gapMs: [300, 130] as [number, number], // between slams, quickening
    collapseMs: [450, 280] as [number, number], // each ring closing in, quickening
    finalMs: 520, // the last ring closing in
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
