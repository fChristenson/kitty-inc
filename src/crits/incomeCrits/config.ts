// the income crits an incomeCrit slot (CONFIG.specialCrits) picks from, each
// by its chance relative to their sum; spread into CONFIG via crits/config.ts
export const INCOME_CRIT_CONFIG = {
  incomeCrits: {
    // the number rocketing up into the total, a cluster of blasts rattling
    // across it, capped by a huge one
    windfallCrit: {
      chance: 0.03,
    },
    // a quickening stream of wisp bullets walking across the total, then the
    // number fired in as a slug
    bulletHoseCrit: {
      chance: 0.03,
    },
    // bolts cracking in from the screen's sides onto the total, then a giant
    // one the number shoots up
    boltMagnetCrit: {
      chance: 0.03,
    },
    // bomb wisps lobbed onto the total one after another, a cluster last
    bombLobCrit: {
      chance: 0.03,
    },
    // wisps ringing the total, whirling tighter, then diving in one by one
    haloDiveCrit: {
      chance: 0.03,
    },
    // two wisps racing laps round the total, blasts trailing the leader, both
    // diving in at the finish
    victoryLapCrit: {
      chance: 0.03,
    },
    // a wisp bouncing along under the total, smacking up into it, then dunked
    ceilingBounceCrit: {
      chance: 0.03,
    },
    // a drill biting up into the total, boring through in shoves
    drillBitCrit: {
      chance: 0.03,
    },
    // glitter all over the screen gulped by a hole under the total
    gulpCrit: {
      chance: 0.03,
    },
    // two nozzles coating the total in gold mist until it blows
    goldCoatCrit: {
      chance: 0.03,
    },
    // wisp balls fired up through a fan of pegs onto the total
    pegboardCrit: {
      chance: 0.03,
    },
  },
};
