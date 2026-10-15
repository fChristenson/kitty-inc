import type { EventMeta } from "../../eventMeta";

// the rare "Catcher" event: a catcher wisp dashes along the button's row
// catching wisps dropping from the top, ever faster, then catches a huge one
// on the button in a huge blast
export default {
  label: "Catcher",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    firstCatchMs: 450, // the first drop's catch
    gapMs: [260, 110] as [number, number], // between catches, quickening
    fallMs: [420, 260] as [number, number], // each drop's fall, quickening
    finalFallMs: 520, // the huge drop's plunge
    finalGapMs: 450, // from the last small catch to the huge one
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
