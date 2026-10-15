import type { EventMeta } from "../../eventMeta";

// on the flight stage, a huge meteor rushes at the view and the guns split it
// into two, four, then eight, every split a paying blast
export default {
  label: "Meteor Splitter",
  style: "flight",
  reward: "cash",
  chance: 0.01,
  values: {
    payoutsPerSplit: 0.3, // the floor's payouts each blown meteor pays
  },
} as const satisfies EventMeta;
