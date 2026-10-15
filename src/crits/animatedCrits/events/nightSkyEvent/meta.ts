import type { EventMeta } from "../../eventMeta";

// the rare "Night Sky" event: the wisp traces the crit's own 5/25/125 in
// twinkling stars, which stream into the total; pays like Draw
export default {
  label: "Night Sky",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    flightMs: 2_300, // the wisp's whole flight, out of the button and off the screen
    hopMs: 120, // added per hop between strokes
    showMs: 400, // the finished number twinkling before its stars fly
    mergeSpreadMs: 300, // from the first star leaving for the total to the last
    mergeFlyMs: 500, // each star's flight into the total
  },
} as const satisfies EventMeta;
