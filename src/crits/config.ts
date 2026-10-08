// every crit's tunables, spread into CONFIG (src/config.ts). Pure data whose
// only imports are the equally pure balance files, so config.ts can read it
// at load time
import { FEATURED_CRIT_BALANCE } from "./badgeCrits/balance";
import { PROC_CRIT_BALANCE } from "./floorCrits/balance";
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
  // once its gateway hits: exactly one of these, each with its chance (they
  // add up to 1). One that can't play (an animated crit cooling down) is a
  // badge crit instead
  specialCrits: {
    // a badge crit: the featured and other special crits in badgeCrits/balance
    badgeCrit: {
      chance: 0.1,
    },
    // an animated event (animatedCrits/config.ts); none can land again
    // until cooldownMs after one has fully played out
    animatedCrit: {
      chance: 0.04,
      cooldownMs: 30_000,
    },
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
    // its number's characters firing into its floor's bar
    rapidFireCrit: {
      chance: 0.04,
    },
    // the crit moments: once its number has slammed in, it pinballs between
    // the bars in view, snowballs down them (growing a step a bar), is
    // juggled onto them, stomps onto all of them or rains onto them, each
    // other bar it hits landing levels
    pinballCrit: {
      chance: 0.03,
    },
    snowballCrit: {
      chance: 0.03,
    },
    juggleCrit: {
      chance: 0.03,
    },
    stompCrit: {
      chance: 0.03,
    },
    rainCrit: {
      chance: 0.03,
    },
    // it stamps down onto each bar leaving a glowing print, is catapulted off
    // the top to crash down through them all, or whirls into a tornado
    // flinging a copy onto each
    stampCrit: {
      chance: 0.03,
    },
    catapultCrit: {
      chance: 0.03,
    },
    tornadoCrit: {
      chance: 0.03,
    },
    // it flings copies of itself off its orbit, pulls a train of copies down
    // across the bars, or is blown into bubbles that pop on them
    orbitCrit: {
      chance: 0.03,
    },
    trainCrit: {
      chance: 0.03,
    },
    bubbleCrit: {
      chance: 0.03,
    },
    // a bolt cracking down from the sky and chaining through the bars, each
    // one it strikes paying out double
    lightningCrit: {
      chance: 0.03,
    },
    // a meteor slamming into one bar in view, paying it out x5
    meteorCrit: {
      chance: 0.03,
    },
    // a black hole swallowing the coins off every bar in view, then
    // collapsing and flinging them back, each paying out double
    blackHoleCrit: {
      chance: 0.03,
    },
    // diving into the lowest bar in view, its payout knocking up bar to bar
    // to the top, each paying a step more (x1, x2, x3…)
    dominoCrit: {
      chance: 0.03,
    },
    // a hail of meteors pelting the bars in view, the last huge one paying
    // its own bar x5; an eruption under them flinging blobs onto them; or a
    // star going supernova, its shards slamming into them
    meteorShowerCrit: {
      chance: 0.03,
    },
    volcanoCrit: {
      chance: 0.03,
    },
    supernovaCrit: {
      chance: 0.03,
    },
    // a sun with a galaxy of stars swirling round it, ever faster, going
    // supernova and flinging them off as comets onto the bars in view
    galaxyCrit: {
      chance: 0.03,
    },
    // two suns circling each other ever closer and faster, colliding and
    // flinging glowing blobs onto the bars in view
    binaryStarCrit: {
      chance: 0.03,
    },
    // a comet torn into a chain of fragments slamming into the bars in view
    // one after another, bigger each time; or a glitter cloud collapsing into
    // a newborn star firing jets up and down through them
    pearlsCrit: {
      chance: 0.03,
    },
    starBirthCrit: {
      chance: 0.03,
    },
    // a beam swept down every bar in view, locking onto its own for a blast;
    // a drill grinding down through them; a quake leaping them off their
    // floors; fireworks shells raining copies onto them; or the number
    // shattering into shards that embed in them and detonate together
    laserCrit: {
      chance: 0.03,
    },
    drillCrit: {
      chance: 0.03,
    },
    quakeCrit: {
      chance: 0.03,
    },
    fireworksCrit: {
      chance: 0.03,
    },
    shatterCrit: {
      chance: 0.03,
    },
    // a railgun charging over the bars and firing one shot down through all
    // of them, or a buzzsaw ripping along each one end to end
    railgunCrit: {
      chance: 0.03,
    },
    buzzsawCrit: {
      chance: 0.03,
    },
    // a tractor beam hauling every bar up and dropping them; pillars of
    // light striking each bar from orbit; a nuke's shockwave blasting up
    // through them; or a laser ricocheting from bar to bar down the building
    tractorBeamCrit: {
      chance: 0.03,
    },
    orbitalStrikeCrit: {
      chance: 0.03,
    },
    nukeCrit: {
      chance: 0.03,
    },
    ricochetLaserCrit: {
      chance: 0.03,
    },
    // a plasma ball drifting down through the bars; portals dropping it
    // through them again and again; a bunker buster burrowing down and
    // erupting back up; an airstrike's bombs; a hyperspace jump dropping out
    // onto them; or a swarm of missiles diving onto them
    plasmaBallCrit: {
      chance: 0.03,
    },
    portalCrit: {
      chance: 0.03,
    },
    bunkerBusterCrit: {
      chance: 0.03,
    },
    airstrikeCrit: {
      chance: 0.03,
    },
    hyperspaceCrit: {
      chance: 0.03,
    },
    missileSwarmCrit: {
      chance: 0.03,
    },
    // a bomb bursting into bomblets that each burst again on the bars, or
    // meteors shot down over the building, their debris showering the bars
    clusterBombCrit: {
      chance: 0.03,
    },
    missileDefenseCrit: {
      chance: 0.03,
    },
    // a missile launching off the screen and its warheads screaming back
    // down onto the bars, or a barrage walking up them, then one last salvo
    icbmCrit: {
      chance: 0.03,
    },
    artilleryBarrageCrit: {
      chance: 0.03,
    },
    // a burning ship bouncing down across the bars into the street, or a
    // blade of light slashing through them
    crashLandingCrit: {
      chance: 0.03,
    },
    saberCrit: {
      chance: 0.03,
    },
    // every bar crumbling into dust that swirls up and rebuilds them, fuller
    snapCrit: {
      chance: 0.03,
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

  // animatedCrits/revealStage — the stage every reveal event plays its reveal on
  revealStage: {
    windUpMs: 220, // the screen leaning in and rumbling before each whip
    slideMs: 420, // the whip pan in over the floors, and back out
  },

  // animatedCrits/flightStage — the stage every space-flight event flies on
  flightStage: {
    windUpMs: 250, // the frozen floors rumbling before the dive
    diveMs: 350, // the floors zooming away as the stage's blue takes over
    arriveMs: 650, // the floors rushing up out of the distance until the crash
    holdMs: 350, // the crash's flash and blast before the screen unfreezes
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
