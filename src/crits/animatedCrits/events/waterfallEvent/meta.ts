import type { EventMeta } from "../../eventMeta";

// the rare "Waterfall" event: coins spill off the top button in view and
// cascade down the building's side from button to button, each tipping in
// more, then pour into the total; pays the floor's payout once per button the
// falls pass
export default {
  label: "Waterfall",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    dropMs: 250, // each coin's fall from one button to the next
    maxFloors: 5, // the most buttons the falls cascade over
  },
} as const satisfies EventMeta;
