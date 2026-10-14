// the rate crits a rateCrit slot (CONFIG.specialCrits) picks from: a special
// group on the income bars in view, its rewards on their rate. Each kind by
// its chance relative to their sum; spread into CONFIG via crits/config.ts
export const RATE_CRIT_CONFIG = {
  rateCrits: {
    // a bolt cracking down onto every bar and crackling along it, each then
    // running twice as fast for a while
    overclockCrit: {
      chance: 0.03,
    },
    // a racer and its chaser lapping every bar, each shifting up a gear for
    // good; rarer, being for good
    shiftUpCrit: {
      chance: 0.01,
    },
    // a wisp hopping along every bar, each payout after quicker than the last
    quickstepCrit: {
      chance: 0.03,
    },
    // a wisp looping through twin rings over and under every bar, each pass
    // banking a double payout
    shortcutCrit: {
      chance: 0.03,
    },
    // swipes slashing every bar in two, welded back gold, each then paying
    // more for good; rarer, being for good
    cleanCutCrit: {
      chance: 0.01,
    },
    // a wisp charging on every bar's readout until it bursts, each bar then
    // paying more for a while
    woundUpCrit: {
      chance: 0.03,
    },
    // a turret scanning an aim laser over the bars, locking each, then firing
    // every beam: each bar's next payout five times as big, its own ten
    crosshairsCrit: {
      chance: 0.03,
    },
    // a slab pressing on a wisp at every bar's end until they crumble, each
    // bar then faster for good; rarer, being for good
    compressorCrit: {
      chance: 0.01,
    },
  } satisfies Record<string, { chance: number }>,
};
