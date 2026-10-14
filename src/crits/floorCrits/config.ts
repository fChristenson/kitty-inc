// the floor slot's own kinds a floorCrit slot (CONFIG.specialCrits) picks
// from, beside the floor crits (each by its meta.ts chance, all relative to
// their sum); spread into CONFIG via crits/config.ts
export const FLOOR_CRIT_CONFIG = {
  floorCrits: {
    // the crit also landing on the floor above / below
    critUp: {
      chance: 0.04,
    },
    critDown: {
      chance: 0.04,
    },
    // a second crit number (picked by the tiers' own odds) smashing into it,
    // paying their sum
    mergeCrit: {
      chance: 0.04,
    },
  },
} as const;