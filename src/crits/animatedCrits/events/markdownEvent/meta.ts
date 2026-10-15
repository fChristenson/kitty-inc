import type { EventMeta } from "../../eventMeta";

// a wisp gun shoots the price on every button in view in quick fire; each
// flips over onto a cheaper one, the clicked floor's own last with the
// biggest cut in the huge blast
export default {
  label: "Markdown",
  style: "gunfire",
  reward: "price cuts",
  chance: 0.01,
  values: {
    firstShotMs: 260, // from the click to the first shot
    flyMs: 150, // a shot's flight onto its button
    gapMs: 48, // between shots
    cut: 0.2, // off each other button's price, for good
    ownCut: 0.4, // off the clicked button's price, for good
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
