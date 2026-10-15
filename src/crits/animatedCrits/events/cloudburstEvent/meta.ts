import type { EventMeta } from "../../eventMeta";

// drops of light pelt the bars in view, each a splash and a flat ring, a
// drizzle quickening to a downpour; a hush while a huge drop gathers, then it
// plunges onto the clicked floor and its giant ring rolls up and down the
// building, every bar it crosses a crit tier up
export default {
  label: "Cloudburst",
  style: "ripple",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    firstMs: 180, // from the click till the first drop lands
    drops: 40, // drops in the rain
    gapsMs: [70, 8] as [number, number], // between drops, closing to a downpour
    fallMs: 150, // each drop's fall
    hushMs: 260, // from the last drop till the huge one lets go
    plungeMs: 170, // the huge drop's plunge
    ringMs: 340, // its ring rolling out to the screen's edges
    clickedTiers: 2, // crit tiers for the clicked floor (one for the rest)
    clickedGapMs: 120, // between the clicked floor's tiers
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
