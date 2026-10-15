import type { EventMeta } from "../../eventMeta";

// gift boxes of light drop onto every floor in view with room to hire; swift
// slashes cut them open in quick fire down the building, lids and sides
// sliding apart, glitter spilling, a cat-wisp leaping out onto each floor as
// a new worker; the clicked floor's big box is cut in a cross, several cats
// bursting out
export default {
  label: "Unboxing",
  style: "slice",
  reward: "hires",
  chance: 0.01,
  values: {
    firstMs: 420, // from the click till the first cut
    dropGapMs: 45, // between the boxes dropping in
    gapsMs: [230, 100] as [number, number], // between the cuts, quickening
    crossGapMs: 170, // from the last cut till the cross on the big box
    clickedHires: 3, // cats bursting out of the big box
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
