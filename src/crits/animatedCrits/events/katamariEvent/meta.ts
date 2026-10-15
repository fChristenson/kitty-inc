import type { EventMeta } from "../../eventMeta";

// a ball of cash rolls along the bars picking up the coins on them, then into
// the total
export default {
  label: "Katamari",
  style: "money",
  reward: "cash",
  chance: 0.01,
  values: {
    dropMs: 250, // the ball dropping onto the top bar
    rollMs: 420, // each roll along a bar, quickening
    fallMs: 160, // tumbling off a bar's end onto the next
    launchMs: 380, // the leap into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
