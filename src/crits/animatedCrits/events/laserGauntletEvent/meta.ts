import type { EventMeta } from "../../eventMeta";

// on the flight stage, laser grids rush in, the guns blowing each one's
// emitters in turn, the last eight-sided
export default {
  label: "Laser Gauntlet",
  style: "flight",
  reward: "perma tier",
  chance: 0.01,
} as const satisfies EventMeta;
