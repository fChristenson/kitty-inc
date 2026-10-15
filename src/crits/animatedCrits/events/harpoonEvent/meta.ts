import type { EventMeta } from "../../eventMeta";

// the button harpoons the bars on lines of cash, tugs them, then rips into
// the total
export default {
  label: "Harpoon",
  style: "mix",
  reward: "levels + cash",
  chance: 0.01,
  values: {
    fireGapMs: 140, // between harpoons
    flightMs: 220, // each harpoon's flight
    streamMs: 1000, // each line of cash pouring
    tugGapMs: 260, // between tugs
    ripMs: 340, // the harpoons whipped up into the total
    levelShare: 0.02, // per bar, on the spear and each tug
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
