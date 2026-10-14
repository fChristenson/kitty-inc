// every crit's tunables, spread into CONFIG (src/config.ts). Pure data whose
// only imports are the equally pure balance files, so config.ts can read it
// at load time
import { BADGE_CRIT_BALANCE } from "./badgeCrits/balance";
import { PROC_CRIT_BALANCE } from "./floorCrits/balance";
import { ANIMATED_EVENT_CONFIG } from "./animatedCrits/config";

export const CRIT_CONFIG = {
  // critTypes' CRIT_TIER_CONFIG — odds + free-upgrade/
  // sale-payout/permanent-rate multiplier per tier (color/label are cosmetic,
  // not balance, and stay defined alongside CRIT_TIER_CONFIG itself).
  crit: {
    ...BADGE_CRIT_BALANCE,
    ...PROC_CRIT_BALANCE,
    crit: { chance: 0.08, multiplier: 3 },
    mega: { chance: 0.015, multiplier: 7 },
    ultra: { chance: 0.001, multiplier: 10 },
    // a landed crit of any tier is a cash crit this often (else a multiplier
    // crit): it pays the price of its tier's upgrades times upgradeCosts at
    // once instead of them; special crits ride either
    cashCrit: { chance: 0.5, upgradeCosts: 1 },
    // an income crit pays this many seconds of the company's income per
    // multiple of its tier, into the total
    incomeCritSeconds: 10,
    // a boosted perma worker speeds its floor up by its tier's multiplier to
    // this power: 0.43 gives x1.6/x2.3/x2.7
    permaBoostExponent: 0.43,
    // one reward payout (payout crits, cash events) pays this many seconds of
    // its floor's income; a bar cycle is under a second, too small to feel
    payoutSeconds: 30,
    // a floor unlocked for free starts at this share of the level below it,
    // so a free floor is still worth having once floors are cheap
    freeFloorLevelShare: 0.5,
    // a Hot Button tap rolls its next crit up to this many times, till one lands
    hotButtonRolls: 3,
    // the taps a crit landing on a Nail Gun's button plays for (twice on its own)
    nailGunTaps: 3,
    // Bolt Cutter's levels on the floor it opens, per the crit's multiple
    boltCutterLevels: 5,
    // Jump Start's payout from the floor it opens, in full payouts per the
    // crit's multiple
    jumpStartPayouts: 1,
    // while frames run slower than this (ms, eased over the last ~10), a new
    // special crit can't proc until the crits playing have finished and
    // procSettleMs more have passed for their rewards' coins and labels
    procSlowFrameMs: 18,
    procSettleMs: 1000,
    // Conjure's cash: the price of the floor it opens, times this
    conjurePriceBack: 1,
    // Overclock: a bar this many times as fast for overclockMs
    overclockSpeed: 2,
    overclockMs: 30_000,
    // Shift Up: a bar this many times as fast for good
    shiftUpSpeed: 2,
    // Quickstep: for quickstepMs every landing and payout speeds a bar up by
    // quickstepStep, up to quickstepMaxSpeed
    quickstepMs: 30_000,
    quickstepStep: 0.1,
    quickstepMaxSpeed: 3,
    // Shortcut: each pass banks one payout this many times as big
    shortcutPayout: 2,
    // Clean Cut: a bar's payouts this many times as big for good (its own
    // cleanCutOwnPayout)
    cleanCutPayout: 1.25,
    cleanCutOwnPayout: 1.5,
    // Wound Up: a bar's payouts this many times as big for woundUpMs
    woundUpPayout: 1.5,
    woundUpMs: 30_000,
    // Half Off: half-price taps per the crit's multiple (twice on its own)
    halfOffTaps: 1,
    // Sweep Clean: the next locked floor's price, times this
    sweepCleanPrice: 0.5,
    // Pull Up: the floor it opens this many times as fast for good
    pullUpSpeed: 2,
    // Spring Loaded: hiring taps per the crit's multiple (twice on its own)
    springLoadedHires: 0.5,
    // Housewarming: the floor it opens pays double this many payouts
    housewarmingPayouts: 5,
    // Crosshairs: a bar's next payout this many times as big (its own
    // crosshairsOwnPayout)
    crosshairsPayout: 5,
    crosshairsOwnPayout: 10,
    // Deep Bore: taps levelling the floor above per the crit's multiple
    // (twice on its own)
    deepBoreTaps: 1,
    // Heavy Hand: taps landing three levels per the crit's multiple (twice on
    // its own)
    heavyHandTaps: 0.5,
    // Vice: the floor it opens has its button charged with this many levels
    // per the crit's multiple
    viceCharge: 2,
    // Compressor: a bar this many times as fast for good (its own
    // compressorOwnSpeed)
    compressorSpeed: 1.2,
    compressorOwnSpeed: 1.4,
    // Afterburn: a bar afterburnSpeed times as fast, fading back to its own
    // speed over afterburnMs
    afterburnSpeed: 3,
    afterburnMs: 20_000,
    // Supercharge: a bar's next superchargePayouts payouts (its own
    // superchargeOwnPayouts) superchargePayout times as big
    superchargePayout: 3,
    superchargePayouts: 3,
    superchargeOwnPayouts: 6,
    // Splash Zone: taps also levelling the floors above and below, per the
    // crit's multiple (twice on its own)
    splashZoneTaps: 0.5,
    // Shred: the floor it opens gets this many double taps per the crit's
    // multiple
    shredTaps: 1,
    // Double Time: a bar doubleTimeSpeed times as fast for its next
    // doubleTimePayouts payouts (its own doubleTimeOwnPayouts)
    doubleTimeSpeed: 3,
    doubleTimePayouts: 4,
    doubleTimeOwnPayouts: 8,
    // Trickle Down: taps also levelling up to trickleDownFloors floors below,
    // per the crit's multiple (twice on its own)
    trickleDownTaps: 0.5,
    trickleDownFloors: 3,
    // Burn Through: the floor it opens gets this many half-price taps per
    // the crit's multiple
    burnThroughTaps: 2,
    // gateway roll for the whole "special crit" (chain/boost/bounce/
    // explosion/booty/upgrade) system: checked ONCE per landed crit/mega/
    // ultra, before any of the individual proc chances (badgeCrits/balance, floorCrits/balance) are even
    // rolled — a miss here means NONE of them get a chance to land at all
    // this time, silently (see rollCrit in crits/critTypes). A hit just
    // opens the door to the existing independent-roll-then-cap-at-2 logic,
    // it doesn't guarantee a proc actually lands
    specialCritGatewayChance: 0.1,
  },

  // crits/critTypes' rollCrit — what a landed crit's special slot carries
  // once its gateway hits: exactly one of these, picked by their chances
  // (relative to their sum). One that can't play (an animated or floor crit
  // cooling down) is a badge crit instead
  specialCrits: {
    // a badge crit: the badge and other special crits in badgeCrits/balance
    badgeCrit: {
      chance: 0.46,
    },
    // a floor crit (by their meta.ts chances, beside floorCrits below) on a
    // multiplier crit, an income crit on a cash crit;
    // neither can land again until cooldownMs after the last one was picked
    // and after it played out (they share one player)
    floorCrit: {
      chance: 0.46,
      cooldownMs: 15_000,
    },
    // a button crit (buttonCrits) or a lock crit (lockCrits, only while the
    // locked floor is in view), always on a multiplier crit; each group can't
    // land again until its cooldownMs after the last was picked and played out
    buttonCrit: {
      chance: 0.46,
      cooldownMs: 15_000,
    },
    lockCrit: {
      chance: 0.46,
      cooldownMs: 15_000,
    },
    // a rate crit (rateCrits), always on a multiplier crit
    rateCrit: {
      chance: 0.46,
      cooldownMs: 15_000,
    },
    // an animated event (animatedCrits/config.ts); none can land again
    // until cooldownMs after one has fully played out
    animatedCrit: {
      chance: 0.46,
      cooldownMs: 15_000,
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
