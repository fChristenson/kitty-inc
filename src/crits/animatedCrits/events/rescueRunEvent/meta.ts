import type { EventMeta } from "../../eventMeta";

// the floors' screen drops away in columns onto a night street; the ship
// races low between the buildings, locking on and shooting open the glowing
// cages hanging off them, faster and in clusters, each freeing a cat-wisp
// (a free hire); a big cage over the street blows open in a chain freeing
// several, then the ship flies into a giant screen of the floors
export default {
  label: "Rescue Run",
  style: "rail shooter",
  reward: "hires",
  chance: 0.01,
  values: {
    splitMs: 350, // the floors' screen's columns dropping away
    // each small cage shot open, from the click, quickening into clusters
    cageHitMs: [
      520, 900, 1220, 1480, 1550, 1760, 1820, 1880, 2040, 2090, 2140, 2190,
    ],
    bigHitMs: 2520, // the big cage over the street shot
    chainGapMs: 60, // between the big cage's chain of blasts
    bigCats: 5, // cats freed out of the big cage, one a blast
    catMs: 320, // a freed cat's streak into the floors' screen
    hireGapMs: 70, // between the hires' cheers once back on the floors
  },
} as const satisfies EventMeta;
