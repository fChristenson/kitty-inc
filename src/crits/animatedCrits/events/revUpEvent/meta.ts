import type { EventMeta } from "../../eventMeta";

// an engine wisp beside the clicked bar revs, each throb quicker and harder,
// glowing white-hot as streaks race in off the floors, then rockets up into
// the total dragging a river of coins
export default {
  label: "Rev Up",
  style: "charge",
  reward: "cash",
  chance: 0.01,
  values: {
    firstMs: 160, // from the click till the engine lights up
    revMs: 1250, // its revving, till it launches
    revs: 8, // throbs, closing up
    launchMs: 230, // rocketing up into the total
    reward: 4, // floor income × floor number × this
    holdMs: 300,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
