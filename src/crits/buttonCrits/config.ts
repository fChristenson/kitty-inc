// the button crits a buttonCrit slot (CONFIG.specialCrits) picks from: a
// special group on the upgrade buttons in view, its rewards on the buttons.
// Each kind by its chance relative to their sum; spread into CONFIG via
// crits/config.ts
export const BUTTON_CRIT_CONFIG = {
  buttonCrits: {
    // wisps diving onto every button, each flipping onto a sure crit
    sureShotCrit: {
      chance: 0.03,
    },
    // every button pressing itself in a quickening rattle, levels each press
    autopressCrit: {
      chance: 0.03,
    },
    // a ball ricocheting off the screen's sides from button to button,
    // stamping each with free taps
    freeTapsCrit: {
      chance: 0.03,
    },
    // bolts forking into every button, charging its next tap with levels
    overchargeCrit: {
      chance: 0.03,
    },
    // a nozzle wisp spraying every button gold, each tap of it then paying
    // its bar's payout too
    gildedCrit: {
      chance: 0.03,
    },
    // bombs on every button blowing in a chain, each tap of it then landing
    // two levels
    blastingCapsCrit: {
      chance: 0.03,
    },
    // beams locking the crit's own button onto every other, each tap of it
    // then levelling them all
    linkUpCrit: {
      chance: 0.03,
    },
    // a disk of stars flung onto every button, each tap of it then rolling
    // its next crit more often
    hotButtonCrit: {
      chance: 0.03,
    },
    // a gun wisp nailing every button, its next crit then sticking on it
    nailGunCrit: {
      chance: 0.03,
    },
    // a wisp charging up on every bar's end and darting into its button,
    // each tap of it then hiring a worker
    springLoadedCrit: {
      chance: 0.03,
    },
    // a drill boring into every button, each tap of it then costing half
    halfOffCrit: {
      chance: 0.03,
    },
    // drills boring up into every button like pistons, each tap of it then
    // levelling the floor above too
    deepBoreCrit: {
      chance: 0.03,
    },
    // slabs slamming in unison on a wisp over every button, each tap of it
    // then landing three levels
    heavyHandCrit: {
      chance: 0.03,
    },
    // drops of light splashing onto the buttons, quickening to a downpour,
    // each tap of them then levelling the floors above and below too
    splashZoneCrit: {
      chance: 0.03,
    },
    // drops of light trickling down the buttons, each tap of them then
    // levelling the floors below too
    trickleDownCrit: {
      chance: 0.03,
    },
  } satisfies Record<string, { chance: number }>,
};
