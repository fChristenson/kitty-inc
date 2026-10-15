import type { EventMeta } from "../../eventMeta";

// a ball of catnip over the clicked floor pulls the glitter and wisps off
// every floor in view, a trickle then a flood, swelling and trembling; it
// collapses to a point and bursts, flinging wisps that dive onto the floors,
// each a new worker, the clicked floor last with several
export default {
  label: "Catnip",
  style: "pull",
  reward: "hires",
  chance: 0.01,
  values: {
    firstMs: 150, // from the click till the ball pops up and starts pulling
    pullMs: 1100, // the pull, till the last speck is sucked in
    collapseMs: 150, // the ball collapsing to a point before the burst
    hireMs: 280, // from the burst till the first hire lands
    hireGapMs: 130, // between the first two hires landing, each next gap shorter
    clickedHires: 3, // hires landing on the clicked floor, last
    holdMs: 500,
    mergeMs: 0,
  },
  isNew: true,
} as const satisfies EventMeta;
