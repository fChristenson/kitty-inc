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
  } satisfies Record<string, { chance: number }>,
};
