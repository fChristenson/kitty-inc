import type { EventMeta } from "../../eventMeta";

// a huge storm cloud spreads turning across the top of the frozen screen,
// lightning flickering inside; a funnel lowers out of it and its foot tears
// zigzag across every bar in view, each one flashing a crit tier up as it
// touches, its glitter spun up; it winds up to a blur and flings it all back
// onto the bars in one burst, the last crit tiers
export default {
  label: "Supercell",
  style: "tornado",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    firstMs: 100, // from the click till the cloud starts spreading
    cloudMs: 340, // the cloud spreading across the top of the screen
    lowerMs: 240, // the funnel lowering out of it onto the top bar
    sweepMs: 1000, // its foot's zigzag over every bar, quickening
    windMs: 220, // winding up to a blur
    flingMs: 240, // everything flung back onto the bars
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
