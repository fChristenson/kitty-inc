import type { EventMeta } from "../../eventMeta";

// on the flight stage, shells streak up and burst round the view into glitter
// chrysanthemums, each paying, a finale of six at once
export default {
  label: "Fireworks Flight",
  style: "flight",
  reward: "cash",
  chance: 0.01,
  values: {
    payoutsPerShell: 0.4, // the floor's payouts each shell pays
  },
} as const satisfies EventMeta;
