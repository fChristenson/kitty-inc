// the lock crits a lockCrit slot (CONFIG.specialCrits) picks from: a special
// group on the locked floor at the top, its rewards on it. Each kind by its
// chance relative to their sum; spread into CONFIG via crits/config.ts
export const LOCK_CRIT_CONFIG = {
  lockCrits: {
    // wisp bullets hammering the locked floor until it bursts open
    breachCrit: {
      chance: 0.03,
    },
    // bombs on the locked floor and the one above, blowing both open
    twoUpCrit: {
      chance: 0.03,
    },
    // a scanner beam sweeping the unlock price until it shatters to a
    // fraction of it
    clearanceCrit: {
      chance: 0.03,
    },
    // a drill boring up through the locked floor, opening it at the crit's
    // tier
    lockpickCrit: {
      chance: 0.03,
    },
    // bolts striking the locked floor until a giant one splits it open, its
    // bar filling with levels
    boltCutterCrit: {
      chance: 0.03,
    },
    // wisps bouncing up the building into the locked floor, dropping in as
    // its new cats once it bursts open
    moveInCrit: {
      chance: 0.03,
    },
    // a racer wisp and its chaser lapping the locked floor until it bursts
    // open, its chairs, supplies and manager dropped in
    hotLapCrit: {
      chance: 0.03,
    },
  } satisfies Record<string, { chance: number }>,
};
