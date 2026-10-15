import type { EventMeta } from "../../eventMeta";

// the frozen screen is a pane of glass: drops of light splat onto it over the
// bars in view, a drizzle quickening to a downpour, the heavy ones' rings
// warping the frame and flipping their bar a crit tier up; a hush while a
// huge drop swells over the clicked floor, then it smacks the pane and its
// giant ring warps the whole screen, the clicked floor tiered up the most
export default {
  label: "Windowpane",
  style: "ripple",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    firstMs: 160, // from the click till the first drop splats
    drops: 32, // drops in the rain
    gapsMs: [64, 9] as [number, number], // between drops, closing to a downpour
    fallMs: 130, // each drop's last stretch onto the pane
    heavySpan: [0.1, 0.92] as [number, number], // where in the rain the heavy (tier) drops land
    hushMs: 230, // from the last drop till the huge one smacks, swelling
    ringMs: 480, // its giant ring warping out to the screen's corners
    clickedTiers: 3, // crit tiers for the clicked floor (one for the rest)
    clickedGapMs: 110, // between the clicked floor's tiers
    holdMs: 450,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
