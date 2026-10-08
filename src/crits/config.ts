// every crit's tunables, spread into CONFIG (src/config.ts). Pure data whose
// only imports are the equally pure balance files, so config.ts can read it
// at load time
import { FEATURED_CRIT_BALANCE } from "./badgeCrits/balance";
import { PROC_CRIT_BALANCE } from "./floorCrits/balance";
import { FLOOR_CRIT_CONFIG } from "./floorCrits/config";
import { ANIMATED_EVENT_CONFIG } from "./animatedCrits/config";

export const CRIT_CONFIG = {
  // critTypes' CRIT_TIER_CONFIG — odds + free-upgrade/
  // sale-payout/permanent-rate multiplier per tier (color/label are cosmetic,
  // not balance, and stay defined alongside CRIT_TIER_CONFIG itself).
  crit: {
    ...FEATURED_CRIT_BALANCE,
    ...PROC_CRIT_BALANCE,
    crit: { chance: 0.08, multiplier: 3 },
    mega: { chance: 0.015, multiplier: 7 },
    ultra: { chance: 0.001, multiplier: 10 },
    // a boosted perma worker speeds its floor up by its tier's multiplier to
    // this power: 0.43 gives x1.6/x2.3/x2.7
    permaBoostExponent: 0.43,
    // one reward payout (payout crits, cash events) pays this many seconds of
    // its floor's income; a bar cycle is under a second, too small to feel
    payoutSeconds: 30,
    // a floor unlocked for free starts at this share of the level below it,
    // so a free floor is still worth having once floors are cheap
    freeFloorLevelShare: 0.5,
    // gateway roll for the whole "special crit" (chain/boost/bounce/
    // explosion/booty/upgrade) system: checked ONCE per landed crit/mega/
    // ultra, before any of the individual proc chances (badgeCrits/balance, floorCrits/balance) are even
    // rolled — a miss here means NONE of them get a chance to land at all
    // this time, silently (see rollCrit in crits/critTypes). A hit just
    // opens the door to the existing independent-roll-then-cap-at-2 logic,
    // it doesn't guarantee a proc actually lands
    specialCritGatewayChance: 0.15,
    bonusTierGatewayChance: 0.01,
  },

  // crits/critTypes' rollCrit — what a landed crit's special slot carries
  // once its gateway hits: exactly one of these, picked by their chances
  // (relative to their sum). One that can't play (an animated or floor crit
  // cooling down) is a badge crit instead
  specialCrits: {
    // a badge crit: the featured and other special crits in badgeCrits/balance
    badgeCrit: {
      chance: 0.46,
    },
    // a floor crit: one of floorCrits below, picked by their chances; none
    // can land again until cooldownMs after the last one was picked and
    // after it played out
    floorCrit: {
      chance: 0.46,
      cooldownMs: 5_000,
    },
    // an animated event (animatedCrits/config.ts); none can land again
    // until cooldownMs after one has fully played out
    animatedCrit: {
      chance: 0.04,
      cooldownMs: 30_000,
    },
    // a badge crit whose badge turns shimmer (landed 10+ times) or glitter
    // (100+) foil
    badgeShimmer: {
      chance: 0.03,
    },
    badgeGlitter: {
      chance: 0.01,
    },
  },

  // the floor crits a floorCrit slot picks from (floorCrits/config.ts)
  ...FLOOR_CRIT_CONFIG,

  // badgeCrits/badgeCapsule — the mystery badge capsule a building earns once
  // every floor is at the level cap with every upgrade bought, opened from its
  // marker on the city map: on the reveal stage, the capsule drops in and rolls
  // until a wisp dives into its seam and it pops open on a badge never landed,
  // which then lands on the ground floor
  badgeCapsule: {
    dropMs: 350, // the capsule falling onto the light
    rolls: 1, // back-and-forth rolls before the wisp dives
    rollMs: 1_200, // one roll to one side, over to the other and back
    flyMs: 750, // the wisp swooping in to hover over it
    diveMs: 220, // the wisp dipping to tap its seam
    warpMs: 420, // the tapped capsule wobbling and swelling until it bursts
    growMs: 450, // the badge popping out
    holdMs: 900, // the badge and its title
  },

  // every animated crit's own block (animatedCrits/config.ts)
  ...ANIMATED_EVENT_CONFIG,
} as const;
