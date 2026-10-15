import type { EventMeta } from "../../eventMeta";

// the rare "Whack-a-Mole" event: wisps pop up out of a grid of holes and a
// big gold mallet whacks each into coins, ever faster, until it smashes a
// huge last one and the coins sweep in
export default {
  label: "Whack-a-Mole",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    firstWhackMs: 380, // the holes opening and the mallet's first swing
    gapMs: [260, 120] as [number, number], // between whacks, quickening
    finalMs: 520, // the mallet swelling and rearing back for the last
    holdMs: 450, // after the last whack, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
