import type { EventMeta } from "../../eventMeta";

// the rare "Pitcher" event: the wisp draws the crit's own 5/25/125 in solid
// lines open at the top, and money pours down into each finished digit,
// filling it; pays like Draw
export default {
  label: "Pitcher",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    flightMs: 2_300, // the wisp's whole flight, out of the button and off the screen
    hopMs: 120, // added per hop between strokes
    gapShare: 0.14, // the open top of each digit, of its height
    pourDelayMs: 120, // from a digit's last line to its pour
    pourMs: 800, // how long each digit's pour lasts
    travelMs: 650, // each coin's fall from the top of the screen to its spot
    hangMs: 400, // the full number hanging before the merge
    mergeMs: 500,
    breakSpreadMs: 150, // the lines' sparkles leaving for the total, first to last
    breakFlyMs: 350, // each sparkle's flight into the total
  },
} as const satisfies EventMeta;
