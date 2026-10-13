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
  } satisfies Record<string, { chance: number }>,
};
