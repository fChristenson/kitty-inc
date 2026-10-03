// Central balance sheet for every number that feeds into "how much money is being
// made" — per-floor income growth, upgrade pricing, crit-tier odds/payouts, sale
// boosts, and corporation-wide modifiers. This is
// the one place to tune when rebalancing income across methods so they stay
// proportionate to each other — nothing else in the codebase should hardcode a
// balance number already owned here; add new tunable values as new fields instead
// of a fresh standalone constant elsewhere. Pure data whose only imports are the
// equally pure src/critBalance files (every proc's odds, grouped per file) —
// safe for any module (including circular-import-sensitive ones like
// floors/index.ts) to read.
import { FEATURED_CRIT_BALANCE } from "./critBalance";
import { PROC_CRIT_BALANCE } from "./critBalance/procs";

export const CONFIG = {
  // Floor income and interval scale together up to the starting interval limit.
  // With a 1s limit, floors share a base rate; buildings scale the whole economy.
  floors: {
    floorEconomyMultiplierPerBuilding: 1_000,
    baseIncomeAmount: 1,
    incomeGrowthFactor: 2,
    baseIncomeIntervalSeconds: 1,
    baseUpgradeCost: 2,
    baseUnlockCost: 200,
    unlockCostGrowthFactor: 2,
    baseRateStep: 2,
  },

  // src/buildings/index.ts — purchase prices only; floor scaling lives in floors.
  buildings: {
    basePrice: 125_000_000_000,
  },

  // src/floors/incomePanel/index.ts — how a floor's income/interval evolve as
  // it's upgraded, and the bounds its payout cycle is clamped to.
  incomePanel: {
    minIncomeIntervalSeconds: 0.5,
    maxIncomeIntervalSeconds: 1,
    upgradeSpeedLevelScale: 20,
    upgradeMilestoneStep: 10,
    upgradePriceLevelScale: 3,
  },

  // src/floors/upgradeButton/index.ts's CRIT_TIER_CONFIG — odds + free-upgrade/
  // sale-payout/permanent-rate multiplier per tier (color/label are cosmetic,
  // not balance, and stay defined alongside CRIT_TIER_CONFIG itself).
  crit: {
    ...FEATURED_CRIT_BALANCE,
    ...PROC_CRIT_BALANCE,
    crit: { chance: 0.08, multiplier: 5 },
    mega: { chance: 0.015, multiplier: 25 },
    ultra: { chance: 0.001, multiplier: 125 },
    // a boosted perma worker speeds its floor up by its tier's multiplier to
    // this power: 0.43 gives x2/x4/x8, about one more boosted worker per step
    permaBoostExponent: 0.43,
    // one reward payout (payout crits, cash events) pays this many seconds of
    // its floor's income; a bar cycle is under a second, too small to feel
    payoutSeconds: 30,
    // a floor unlocked for free starts at this share of the level below it,
    // so a free floor is still worth having once floors are cheap
    freeFloorLevelShare: 0.5,
    // gateway roll for the whole "special crit" (chain/boost/bounce/
    // explosion/booty/upgrade) system: checked ONCE per landed crit/mega/
    // ultra, before any of the individual proc chances (src/critBalance) are even
    // rolled — a miss here means NONE of them get a chance to land at all
    // this time, silently (see rollCrit in shared/critTypes). A hit just
    // opens the door to the existing independent-roll-then-cap-at-2 logic,
    // it doesn't guarantee a proc actually lands
    specialCritGatewayChance: 0.25,
    bonusTierGatewayChance: 0.01,
  },

  // src/floors/upgradeButton/index.ts — the purchasable "Sale" boost.
  sale: {
    durationMs: 15_000,
  },

  // src/renovation — bulk "Renovate floors" purchases replay one upgrade at a
  // time, so a huge balance's plan is capped per floor
  renovation: {
    maxUpgradesPerFloor: 100_000,
  },

  // src/floors/eventProcs — every event button below (Boost, Hunt, ...) shares
  // one pool: an event only lands on a crit, taking its special-crit slot
  // instead of the piggyback procs, and none can land again until this long
  // after it has fully played out
  eventProcs: {
    cooldownMs: 30_000,
  },

  // src/floors/boostEvent — the rare "Boost" event button. A crit carrying it
  // arms it once clicked; clicking it freezes the screen, streams coins into
  // one random on-screen worker (or manager) below the top crit tier, and
  // promotes it one crit tier (x5 -> x25 -> x125, see CRIT_TIER_CONFIG): while
  // boosted it multiplies its floor's speed by that tier's multiplier.
  boostEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
  },

  // src/floors/unionEvent — the rare "Union" event button, only on a floor with
  // 2+ workers. Clicking it streams coins from the floor's other workers into
  // its manager (or a random worker) not yet at the top tier; the merged
  // workers leave and it gains one perma tier per merged worker plus their
  // own perma tiers, merging only as many as it needs to max out.
  unionEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
  },

  // src/floors/kickbackEvent — the rare "Kickback" event: its crit's click
  // streams coins from a random 1..maxParticipants of the on-screen workers and
  // managers into the total, which is then multiplied by one more than how many
  // took part
  kickbackEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    // each one streams a full coin burst per tick; more overflows the coin pool
    maxParticipants: 3,
  },

  // src/floors/glimmerEvent — the rare "Glimmer" event: its crit's click
  // streams coins into a golden light on the left of the floor, which then
  // sweeps across it, boosting and promoting one perma tier every worker and
  // manager it passes that isn't at the top tier yet
  glimmerEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    sweepMs: 2_000,
    // then hops to the floor above or below and sweeps it right to left
    moveFloorChance: 0.5,
  },

  // src/floors/huntEvent — the rare "Hunt" event button, only armed while the
  // mouse (src/mouse) is on screen. Clicking it streams coins into the mouse
  // (same freeze/stream/sound as boostEvent), which then grows, turns red and
  // restarts its time on screen; clicking that hunted mouse gives its normal
  // boost plus a guaranteed "special crit crit" bonus tier (5x/25x/125x total
  // income, weighted by the crit tier odds, see shared/bonusTierReward).
  huntEvent: {
    // the mouse is out ~5s of every ~32.5s (src/mouse), so ~6.5x the other
    // events' 0.01 makes Hunt land about as often overall
    chance: 0.065, // per crit whose special-crit gateway hit, mouse on screen
  },

  // src/floors/burstEvent — the rare "Burst" event: its crit's click freezes
  // the screen while its button blows out one explosion of coins and bills over
  // the whole screen; they hang there, then merge into the total, paying the
  // floor's income times its floor number
  burstEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    durationMs: 1_000, // ~0.3s blast out, 0.2s hang, then the merge
    mergeMs: 500, // the last part, where the coins fly into the total
  },

  // src/floors/sprayEvent — the rare "Spray" event: like Burst, but the button
  // sprays a stream sweeping round it instead of one explosion
  sprayEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 500, // how long the stream sprays
    durationMs: 1_500, // stream, ~0.3s last coin out, 0.2s hang, then the merge
    mergeMs: 500,
  },

  // src/floors/fountainEvent — the rare "Fountain" event: like Spray, but the
  // button jets the coins up so they arc over and rain down across the screen
  fountainEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 700, // how long the jet shoots
    travelMs: 700, // each coin's arc up and down
    durationMs: 2000, // jet, the last coin's arc, a short hang, then the merge
    mergeMs: 500,
  },

  // src/floors/rippleEvent — the rare "Ripple" event: coins burst out of the
  // button in round ripples, wide bands each trailed by a thin ring or two,
  // that keep rolling outward at their own pace, then sweep into the total;
  // pays once per ring
  rippleEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    rings: 6,
    thinGapMs: [90, 140] as [number, number], // a thin ring following close behind
    wideGapMs: [260, 360] as [number, number], // before the next wide band
    rippleMs: 2_400, // the rings rolling out, until the coins sweep into the total
    mergeMs: 500, // the coins flying into the total
  },

  // src/floors/wreckingBallEvent — the rare "Wrecking Ball" event: the wisp
  // drops like a heavy ball onto the clicked floor's income bar and bounces on
  // it, each hit an explosion that lands free upgrade levels
  wreckingBallEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    dropMs: 340, // falling from above the screen onto the bar
    bounce: 0.7, // each bounce's speed, of the hit before (a rubber ball)
    chargeMs: 450, // resting on the bar, charging up its leap
    jumpMs: 340, // leaping up jumpHeight px
    jumpHeight: 420,
    slamMs: 130, // slamming back down onto the bar
    holdMs: 600, // after the slam, before the screen unfreezes
    levelShare: 0.1, // free levels in all, of the floor's current level
    minLevels: 10,
  },

  // src/floors/piledriverEvent — the rare "Piledriver" event: the wisp charges
  // over the top of the screen, then plunges straight down through every
  // upgrade button in view, each landing free upgrade levels
  piledriverEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    chargeMs: 550, // swelling and trembling over the top of the screen
    fallMs: 520, // plunging from there off the bottom, accelerating
    holdMs: 700, // after the crater, before the screen unfreezes
    levelShare: 0.1, // free levels per button, of its floor's current level
    minLevels: 10,
  },

  // src/floors/orbitalStrikeEvent — the rare "Orbital Strike" event: a
  // reticle locks onto the clicked floor's income bar and a beam of light
  // slams down onto it from the sky, blasting it up a crit tier
  orbitalStrikeEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    lockMs: 520, // the reticle closing in and locking on
    aimMs: 220, // the thin targeting laser flickering
    beamMs: 260, // the beam blazing after it strikes
    holdMs: 650, // after the strike, before the screen unfreezes
  },

  // src/floors/fuseEvent — the rare "Fuse" event: a spark races along a
  // fuse from the screen's side to the button, which blows up spraying coins
  // across the screen into the total
  fuseEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    burnMs: 900, // the spark racing along the fuse
    holdMs: 550, // the coins hanging after the blast
    mergeMs: 500, // the coins sweeping into the total
  },

  // src/floors/supernovaEvent — the rare "Supernova" event: the wisp swells
  // and pulses in the middle of the screen, collapses and detonates, its
  // shockwave raising every climbable worker it sweeps over one perma tier
  supernovaEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    chargeMs: 750, // swelling and pulsing
    collapseMs: 120, // shrinking to a point
    ringMs: 650, // the shockwave racing out past the screen's corners
    holdMs: 450, // after it's gone, before the screen unfreezes
  },

  // src/floors/bowlingEvent — the rare "Bowling" event: the wisp rolls along
  // the clicked floor like a bowling ball, knocking every worker flying; each
  // lands and climbs one perma tier
  bowlingEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    rollMs: 650, // the ball crossing the screen
    flyMs: 600, // each knocked worker's flip, up and back down
    holdMs: 500, // after the ball's gone and the last lands
  },

  // src/floors/thunderclapEvent — the rare "Thunderclap" event: two wisps
  // smash together on the clicked floor's income bar and the shockwave gives
  // every income bar in view free upgrade levels
  thunderclapEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    rushMs: 600, // the wisps rushing in from the sides
    waveMs: 500, // the shockwave racing up and down the screen
    holdMs: 600, // after it fades, before the screen unfreezes
    levelShare: 0.1, // free levels per floor, of its current level
    minLevels: 10,
  },

  // src/floors/chainReactionEvent — the rare "Chain Reaction" event: mines
  // pop up over the screen and blow one after another from the button, each
  // spraying coins that then sweep into the total
  chainReactionEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    armMs: 320, // the mines popping up before the button blows
    holdMs: 450, // after the last blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/bullseyeEvent — the rare "Bullseye" event:
  // bullseyes pop up over the screen and the button shoots the wisp into each,
  // every hit spraying coins that then sweep into the total
  bullseyeEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    popMs: 220, // each target popping up
    aimMs: 110, // the sight on the first target before the first shot
    travelMs: 90, // each shot's flight from the button
    gapMs: [260, 120] as [number, number], // between shots, quickening
    holdMs: 450, // after the last hit, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/popcornEvent — the rare "Popcorn" event: a row of kernels
  // heats up along the clicked floor and pops at random, ever faster, each
  // leaping up and bursting into coins that then sweep into the total
  popcornEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    heatMs: 500, // the kernels heating up before the first can pop
    popMs: 1_000, // the random pops, piling up toward the end
    jumpMs: 300, // each popped kernel's leap up to where it bursts
    holdMs: 450, // after the last burst, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/newtonsCradleEvent — the rare "Newton's Cradle" event: five
  // wisps hang like a Newton's cradle and clack back and forth, ever faster,
  // each clack spraying coins that then sweep into the total
  newtonsCradleEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    popMs: 260, // the balls popping in as the left one is drawn back
    firstSwingMs: 220, // the left one let go into the first clack
    swingMs: [300, 130] as [number, number], // each out-and-back, quickening
    flyMs: 500, // the balls flung apart on the last clack
    holdMs: 450, // after the last clack, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/juggleEvent — the rare "Juggle" event: three wisps juggled
  // round a figure of eight, ever faster and higher, each catch tossing
  // coins, until all three are hurled up into one blast
  juggleEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    beatMs: [200, 95] as [number, number], // between throws, quickening
    riseMs: 300, // after the last beat, the balls hurled up to meet
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/boomerangEvent — the rare "Boomerang" event: the wisp is
  // hurled out on wide loops that whip back into the button, shedding coins
  // all along them, until the last catch blasts and the coins sweep in
  boomerangEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    throwMs: [560, 380] as [number, number], // each loop out and back, quickening
    holdMs: 450, // after the last catch, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/heartbeatEvent — the rare "Heartbeat" event: the wisp runs a
  // heart monitor trace into the clicked floor's button, every beat throbbing
  // it for free upgrade levels, ever faster, the last slamming into it
  heartbeatEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    firstBeatMs: 220, // the trace running level before the first beat
    gapMs: [280, 130] as [number, number], // between beats, quickening
    spikeMs: [170, 110] as [number, number], // each beat's spike, sharpening
    finalMs: 380, // the last spike up to the top and down into the button
    holdMs: 700, // after the slam, before the screen unfreezes
    levelShare: 0.04, // levels per beat, of the floor's upgrade count (x3 the last)
    minLevels: 3,
  },

  // src/floors/clashEvent — the rare "Clash" event: two wisps streak in and
  // fight like fish in the middle of the screen, slamming again and again,
  // until one last charged slam blasts them into coins that sweep in
  clashEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    entryMs: 380, // streaking in from off screen to the first slam
    roundMs: [400, 250] as [number, number], // each bounce and slam, quickening
    finalMs: 750, // backing off, winding up and charging the last slam
    holdMs: 450, // after the last slam, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/asteroidsEvent — the rare "Asteroids" event: the wisp blasts
  // shot after shot at tumbling gold rocks, cracking big ones in two and
  // bursting small ones into coins that sweep into the total
  asteroidsEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    firstShotMs: 300, // the rocks tumbling in before the first shot
    gapMs: [200, 70] as [number, number], // between shots, quickening
    travelMs: 90, // each shot's flight to its rock
    holdMs: 450, // after the last rock blows, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/whackAMoleEvent — the rare "Whack-a-Mole" event: wisps pop up
  // out of a grid of holes and a big gold mallet whacks each into coins, ever
  // faster, until it smashes a huge last one and the coins sweep in
  whackAMoleEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    firstWhackMs: 380, // the holes opening and the mallet's first swing
    gapMs: [260, 120] as [number, number], // between whacks, quickening
    finalMs: 520, // the mallet swelling and rearing back for the last
    holdMs: 450, // after the last whack, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/drumrollEvent — the rare "Drumroll" event: two wisps beat a
  // big gold drum into a blurring drumroll, coins bouncing off it, then slam
  // down together and burst it, and the coins sweep into the total
  drumrollEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    firstTapMs: 250, // the drum popping up and the sticks dropping in
    gapMs: [130, 35] as [number, number], // between taps, quickening
    finalMs: 450, // the sticks rising, hanging and slamming down together
    holdMs: 450, // after the slam, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/shellGameEvent — the rare "Shell Game" event: three gold cups
  // shuffle the wisp round, ever faster, flicking out coins, then fly off
  // and the found wisp blows, and the coins sweep into the total
  shellGameEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    dropMs: 380, // the cups popping up and the middle one slamming down
    swapMs: [250, 100] as [number, number], // each swap, quickening
    revealMs: 450, // the cups flying off and the found wisp swelling
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/seesawEvent — the rare "Seesaw" event: two wisps catapult
  // each other ever higher off a gold seesaw, coins flung at every landing,
  // until the last rockets the other off the top in a huge blast
  seesawEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    introMs: 320, // the seesaw popping up and the first wisp dropping in
    flightMs: [300, 400] as [number, number], // each launch up and back down, growing
    flipMs: 90, // the plank snapping over on each landing
    holdMs: 500, // after the last landing, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/scratchEvent — the rare "Scratch" event: claw marks rake
  // across the clicked floor's income bar, ever faster, then all burst into
  // coins in a huge blast, and the coins sweep into the total
  scratchEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    firstSwipeMs: 120, // before the first swipe
    gapMs: [150, 45] as [number, number], // between swipes, quickening
    chargeMs: 380, // the tears blazing and trembling before they burst
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/tagEvent — the rare "Tag" event: a big wisp chases a small
  // one darting round the screen, ever faster, knocking coins loose, and
  // catches it on the button in a huge blast
  tagEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    dodgeMs: [300, 130] as [number, number], // each dart, quickening
    lagMs: 300, // how far behind the chaser starts, closing to nothing
    holdMs: 500, // after the catch, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/bumpersEvent — the rare "Bumpers" event: a ball wisp pings
  // between three bumper wisps, ever faster, spraying coins, then all three
  // blow in a huge blast
  bumpersEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    launchMs: 240, // the ball's first shot, off the button
    shotMs: [220, 80] as [number, number], // each shot between bumpers, quickening
    chargeMs: 350, // the bumpers trembling before they blow
    holdMs: 500, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/catcherEvent — the rare "Catcher" event: a catcher wisp
  // dashes along the button's row catching wisps dropping from the top, ever
  // faster, then catches a huge one on the button in a huge blast
  catcherEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    firstCatchMs: 450, // the first drop's catch
    gapMs: [260, 110] as [number, number], // between catches, quickening
    fallMs: [420, 260] as [number, number], // each drop's fall, quickening
    finalFallMs: 520, // the huge drop's plunge
    finalGapMs: 450, // from the last small catch to the huge one
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/implosionEvent — the rare "Implosion" event: rings of wisps
  // collapse onto the button from beyond the screen, ever faster, swelling
  // its core, until a last ring blows it in a huge blast
  implosionEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    firstRingMs: 450, // the first ring's slam
    gapMs: [300, 130] as [number, number], // between slams, quickening
    collapseMs: [450, 280] as [number, number], // each ring closing in, quickening
    finalMs: 520, // the last ring closing in
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/atomEvent — the rare "Atom" event: three electron wisps whirl
  // round a nucleus wisp on crossing orbits, ever faster, slinging coins,
  // then collapse into it and it splits in a huge blast
  atomEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    spinMs: 1_700, // from the orbits growing in to the split
    collapseMs: 400, // the orbits collapsing, at the end of the spin
    holdMs: 500, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/spiralEvent — the rare "Spiral" event: the wisp flies in and
  // loops a wide spiral into the screen's middle, shedding coins, then shoots
  // up into the total and explodes
  spiralEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    spiralMs: 1_500, // from flying in to reaching the middle
    chargeMs: 150, // hanging in the middle, trembling
    shootMs: 140, // shooting up into the total
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/loopEvent — the rare "Loop" event: the wisp flies in, loops
  // a wide circle round the screen's middle, then flies straight up into the
  // total and explodes
  loopEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    entryMs: 220, // flying in onto the circle
    loopMs: 1_800, // the loops, speeding up
    shootMs: 200, // flying straight up into the total
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/eternityEvent — the rare "Eternity" event: the wisp races
  // twice round a huge infinity sign across the screen, shedding coins, then
  // flies up into the total and explodes
  eternityEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    entryMs: 200, // shooting up onto the sign's tip
    passMs: 700, // each pass round the sign
    shootMs: 200, // flying up into the total
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/helixEvent — the rare "Helix" event: two wisps twist round
  // each other in a double helix from the button up into the total, flinging
  // coins at every crossing, then fuse into it and explode
  helixEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    riseMs: 1_700, // from the button up into the total, speeding up
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/yoYoEvent — the rare "Yo-Yo" event: the wisp yo-yos from the
  // total down onto the button and back, ever faster, then snaps into the
  // total and explodes
  yoYoEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    throwMs: [440, 220] as [number, number], // each throw down and back, quickening
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/racetrackEvent — the rare "Racetrack" event: the wisp laps a
  // track round the screen's edges, ever faster, drifting coins off every
  // corner, then peels off into the total and explodes
  racetrackEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    entryMs: 150, // racing in onto the track
    raceMs: 1_600, // the laps, speeding up
    shootMs: 140, // peeling off into the total
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // src/floors/swingEvent — the rare "Swing" event: the wisp swings like a
  // pendulum, ever wider, flinging coins at every top, then lets go into the
  // total and explodes
  swingEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    swingMs: [340, 200] as [number, number], // each swing, quickening
    shootMs: 180, // flying from the last top into the total
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },

  // the wisp coin events on src/floors/wispCover, each with its chance per
  // crit whose special-crit gateway hit, its timings, then holdMs (after the
  // finale, before the coins sweep in) and mergeMs
  // src/floors/kaleidoscopeEvent: six wisps bloom a flower, petal by petal
  kaleidoscopeEvent: {
    chance: 0.01,
    petalMs: [360, 170] as [number, number], // each petal out and back
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/zipperEvent: zigzag stitches down, then unzip up into the total
  zipperEvent: {
    chance: 0.01,
    stitchMs: [170, 70] as [number, number], // each stitch across
    unzipMs: 380, // ripping back up into the total
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/screensaverEvent: DVD-screensaver bounces into a corner
  screensaverEvent: {
    chance: 0.01,
    flightMs: 1_900, // from popping up to hitting the corner
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/sprinklerEvent: the button sprinkles drops that land as coins
  sprinklerEvent: {
    chance: 0.01,
    sprayMs: 1_300, // sweeping, before the last whirl
    emitMs: [80, 40] as [number, number], // between drops, quickening
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/clockworkEvent: a second hand ticks round twice to midnight
  clockworkEvent: {
    chance: 0.01,
    tickMs: [160, 35] as [number, number], // between ticks, quickening
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/holeInOneEvent: chipped in, two bounces, round the rim, in
  holeInOneEvent: {
    chance: 0.01,
    hopMs: [560, 320, 220], // the lob, then each bounce
    rimMs: 420, // whirling round the rim and dropping in
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/leapfrogEvent: two wisps leapfrog across, then into the total
  leapfrogEvent: {
    chance: 0.01,
    vaultMs: [300, 170] as [number, number], // each vault, quickening
    finalMs: 320, // both leaping into the total
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/lineupEvent: scattered wisps line up, then fire into the total
  lineupEvent: {
    chance: 0.01,
    alignMs: 320, // snapping into the row
    trembleMs: 220, // the row trembling before it fires
    fireMs: [140, 50] as [number, number], // between shots, quickening
    flyMs: 150, // each wisp's flight into the total
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/stampedeEvent: a herd gallops across, then charges the total
  stampedeEvent: {
    chance: 0.01,
    runMs: 900, // each wisp's gallop across
    chargeMs: 320, // each wisp's charge up into the total
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/wormholeEvent: the wisp blinks from spot to spot, then the total
  wormholeEvent: {
    chance: 0.01,
    jumpMs: [260, 120] as [number, number], // each dart before it blinks out
    finalMs: 220, // shooting up into the total
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/splatEvent: the wisp hurtles at the screen and splats on it
  splatEvent: {
    chance: 0.01,
    rushMs: [450, 280] as [number, number], // each bounce off and rush back in
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/rouletteEvent: the ball whips round a wheel of coin pockets
  rouletteEvent: {
    chance: 0.01,
    spinMs: 850, // whipping round the rim
    dropMs: 180, // dropping in toward the pockets
    hopMs: 110, // each clatter pocket to pocket
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/freeKickEvent: two shots blocked by the wall, then the top corner
  freeKickEvent: {
    chance: 0.01,
    kickMs: 300, // each shot up into the wall
    reboundMs: 200, // bouncing back off the bottom
    curlMs: 450, // the bending shot into the total
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/slalomEvent: the wisp carves round gates down to the button
  slalomEvent: {
    chance: 0.01,
    gateMs: [320, 170] as [number, number], // each turn, quickening
    holdMs: 450,
    mergeMs: 500,
  },
  // src/floors/lightningEvent: bolts crack down onto the button
  lightningEvent: {
    chance: 0.01,
    strikeMs: 110, // each bolt streaking down
    gapMs: [380, 220] as [number, number], // between bolts, quickening
    holdMs: 450,
    mergeMs: 500,
  },

  // the flowing-cash events on src/floors/wispCover, poured like Stream's river
  // src/floors/fireHoseEvent: a whipping jet of cash gushes into the total
  fireHoseEvent: {
    chance: 0.01,
    sprayMs: 1_500, // the hose gushing
    travelMs: 800, // each coin's trip out the jet and round into the total
  },
  // src/floors/confluenceEvent: rivers pour in and merge into one into the total
  confluenceEvent: {
    chance: 0.01,
    staggerMs: 150, // between rivers starting to pour
    pourMs: 900, // how long each pours
    travelMs: 800, // each coin's trip down its river and up the trunk
  },
  // src/floors/sloshEvent: a pool of cash sloshes, then surges into the total
  sloshEvent: {
    chance: 0.01,
    pourMs: 550, // the button gushing the pool full
    fallMs: 300, // each coin's fall into the pool
    sloshMs: 420, // each slosh across
    surgeMs: 400, // each coin's surge up the wall into the total
    holdMs: 450,
    mergeMs: 500,
  },

  // wisps and flowing cash together, on src/floors/wispCover + cashFlow
  // src/floors/siphonEvent: a wisp under the total siphons a spiral of cash
  siphonEvent: {
    chance: 0.01,
    streamMs: 1_200, // the river pouring
    travelMs: 800, // each coin's trip up the straw
    holdMs: 350,
    mergeMs: 500,
  },
  // src/floors/crossfireEvent: four corner wisps fire rivers that geyser up
  crossfireEvent: {
    chance: 0.01,
    fireMs: 600, // each corner pouring
    travelMs: 600, // each coin's trip down a river
    geyserMs: 500, // the geyser pouring
    holdMs: 350,
    mergeMs: 500,
  },
  // src/floors/gravityWellEvent: rivers whip round a planet wisp into the total
  gravityWellEvent: {
    chance: 0.01,
    gapMs: 160, // between rivers
    streamMs: 500, // how long each pours
    travelMs: 750, // each coin's trip round the planet
    holdMs: 350,
    mergeMs: 500,
  },
  // src/floors/splashdownEvent: a meteor wisp lands in a crown splash of cash
  splashdownEvent: {
    chance: 0.01,
    fallMs: 380, // the meteor falling
    splashMs: 600, // the crown pouring
    travelMs: 650, // each coin's arc out of the impact
    holdMs: 350,
    mergeMs: 500,
  },
  // src/floors/geysersEvent: wisps along the bottom erupt geysers of cash
  geysersEvent: {
    chance: 0.01,
    leadMs: 300, // the wisps popping up before the first eruption
    gapMs: 200, // between eruptions
    streamMs: 550, // how long each erupts
    travelMs: 700, // each coin's trip up a geyser and over
    holdMs: 350,
    mergeMs: 500,
  },
  // src/floors/cashCannonEvent: the button shoots slugs of cash at wisps
  cashCannonEvent: {
    chance: 0.01,
    leadMs: 250, // the targets popping up before the first shot
    gapsMs: [330, 280, 230, 200], // between shots, quickening
    slugMs: 250, // each slug pouring
    travelMs: 380, // each coin's trip to its target
    holdMs: 400,
    mergeMs: 500,
  },
  // src/floors/hooverEvent: a vacuum wisp slurps up puddles of cash
  hooverEvent: {
    chance: 0.01,
    gapMs: 110, // between jets
    jetMs: 250, // each jet gushing
    flyMs: 380, // each coin's arc into its puddle
    leadMs: 450, // before the vacuum sets off
    vacuumMs: 1_400, // the vacuum's run, puddles to total
    holdMs: 300,
    mergeMs: 500,
  },
  // src/floors/airShowEvent: a V of wisps loops trailing contrails of cash
  airShowEvent: {
    chance: 0.01,
    streamMs: 900, // each contrail pouring
    travelMs: 1_250, // each coin's (and wisp's) trip round the loop
    holdMs: 300,
    mergeMs: 500,
  },
  // src/floors/leakEvent: a swelling wisp springs leaks of cash, then bursts
  leakEvent: {
    chance: 0.01,
    leadMs: 300, // swelling before the first leak
    gapMs: 210, // between leaks
    travelMs: 700, // each coin's trip up a leak's jet
    gushMs: 450, // the final gush pouring
    holdMs: 350,
    mergeMs: 500,
  },
  // src/floors/climbEvent: a river zigzags up a ladder of wisps to the total
  climbEvent: {
    chance: 0.01,
    leadMs: 300, // the ladder popping up before the river
    streamMs: 1_000, // the river pouring
    travelMs: 1_100, // each coin's climb
    holdMs: 350,
    mergeMs: 500,
  },
  // src/floors/kiteEvent: a kite wisp flies on a string of cash, snaps, dives
  kiteEvent: {
    chance: 0.01,
    riseMs: 400, // the kite rising off the button
    flyMs: 900, // the kite swooping
    flowMs: 600, // each coin's climb up the string
    diveMs: 380, // the kite diving into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // src/floors/rainbowEvent: a wisp arcs over, laying a rainbow of cash
  rainbowEvent: {
    chance: 0.01,
    streamMs: 900, // the bands pouring
    travelMs: 900, // each coin's trip over the arch
    holdMs: 350,
    mergeMs: 500,
  },
  // src/floors/branchesEvent: a wisp splits and splits, branching the cash
  branchesEvent: {
    chance: 0.01,
    streamMs: 800, // the tree pouring
    travelMs: 1_100, // each coin's trip up the longest branch
    holdMs: 350,
    mergeMs: 500,
  },
  // src/floors/tugOfWarEvent: two wisps heave a rope of cash till it snaps
  tugOfWarEvent: {
    chance: 0.01,
    fillMs: 350, // the button gushing the rope full
    flyMs: 300, // each coin's arc up onto the rope
    flowMs: 900, // each coin's run along the rope
    leadMs: 450, // before the first heave
    heaveGapMs: 230, // between heaves
    recoilMs: 180, // the snapped halves whipping back
    jetMs: 280, // each wisp flinging its half
    flightMs: 350, // each coin's (and wisp's) flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // src/floors/waterwheelEvent: cash pours over a spinning wheel of wisps
  waterwheelEvent: {
    chance: 0.01,
    streamMs: 1_300, // the falls pouring
    travelMs: 1_000, // each coin's trip over the wheel and into the total
    holdMs: 350,
    mergeMs: 500,
  },

  // money: src/floors/braidEvent: three rivers braid up into the total
  braidEvent: {
    chance: 0.01,
    streamMs: 1_100, // the strands pouring
    travelMs: 900, // each coin's climb
    holdMs: 300,
    mergeMs: 500,
  },
  // money: src/floors/skimEvent: a river skips across the screen like a stone
  skimEvent: {
    chance: 0.01,
    streamMs: 700, // the river pouring
    travelMs: 1_300, // each coin's trip, every skip and up into the total
    holdMs: 350,
    mergeMs: 500,
  },
  // money: src/floors/latticeEvent: diagonal rivers weave a net up the screen
  latticeEvent: {
    chance: 0.01,
    gapMs: 90, // between rivers launching
    streamMs: 700, // how long each pours
    travelMs: 1_000, // each coin's climb
    holdMs: 300,
    mergeMs: 500,
  },
  // wisp: src/floors/fireworksEvent: rocket wisps burst into rings of stars
  fireworksEvent: {
    chance: 0.01,
    gapMs: 300, // between launches
    riseMs: 380, // each shell rising
    holdMs: 400,
    mergeMs: 500,
  },
  // wisp: src/floors/slingshotEvent: a wisp drawn back, banks off two walls
  slingshotEvent: {
    chance: 0.01,
    pullMs: 900, // drawn back
    flightMs: 650, // let go, off both walls and into the total
    holdMs: 400,
    mergeMs: 500,
  },
  // wisp: src/floors/marqueeEvent: a light chases round a ring of bulb wisps
  marqueeEvent: {
    chance: 0.01,
    chaseMs: 1_300, // the light chasing round, speeding up
    blazeMs: 200, // every bulb blazing before they fire
    fireMs: 280, // each bulb's flight into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // mix: src/floors/cropDusterEvent: a wisp lays curtains of cash, pass by pass
  cropDusterEvent: {
    chance: 0.01,
    passMs: 420, // each pass across
    fallMs: 450, // each coin's fall
    climbMs: 300, // pulling up into the total
    sweepMs: 300, // the heap sweeping up after it
    flightMs: 320, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix: src/floors/bolasEvent: two wisps whirl on a rope of cash
  bolasEvent: {
    chance: 0.01,
    flightMs: 1_700, // the bolas's flight into the total
    flowMs: 500, // each coin's run along the rope
    holdMs: 300,
    mergeMs: 500,
  },
  // experiment: src/floors/countdownEvent: 3, 2, 1, GO! slams, then a geyser
  countdownEvent: {
    chance: 0.01,
    beatMs: 380, // between slams
    streamMs: 450, // the geyser pouring
    travelMs: 550, // each coin's trip up it
    holdMs: 350,
    mergeMs: 500,
  },
  // experiment: src/floors/sparklerEvent: the button fizzes glitter, then pops
  sparklerEvent: {
    chance: 0.01,
    burnMs: 1_500, // the sparkler fizzing
    holdMs: 450,
    mergeMs: 500,
  },
  // money: src/floors/slinkyEvent: a river coils in loops into the total
  slinkyEvent: {
    chance: 0.01,
    streamMs: 1_000, // the river pouring
    travelMs: 1_100, // each coin's trip round every coil
    holdMs: 300,
    mergeMs: 500,
  },
  // money: src/floors/pipelineEvent: a river runs right-angle pipes to the total
  pipelineEvent: {
    chance: 0.01,
    streamMs: 900, // the river pouring
    travelMs: 1_200, // each coin's trip through the pipes
    holdMs: 350,
    mergeMs: 500,
  },
  // money: src/floors/prismEvent: a beam of cash splits into a fan of rivers
  prismEvent: {
    chance: 0.01,
    streamMs: 900, // the beam pouring
    travelMs: 1_100, // each coin's trip up the beam and round the longest ray
    holdMs: 350,
    mergeMs: 500,
  },
  // wisp: src/floors/trampolineEvent: a wisp bounces ever higher into the total
  trampolineEvent: {
    chance: 0.01,
    dropMs: 300, // the first drop from the top
    holdMs: 400,
    mergeMs: 500,
  },
  // wisp: src/floors/hummingbirdEvent: a wisp hovers and darts stop to stop
  hummingbirdEvent: {
    chance: 0.01,
    dartMs: 70, // each dart between stops
    hoverMs: [260, 110] as [number, number], // each hover, first to last
    holdMs: 400,
    mergeMs: 500,
  },
  // wisp: src/floors/diveBombEvent: circling wisps dive-bomb the button
  diveBombEvent: {
    chance: 0.01,
    circleMs: 650, // the ring circling before the first dive
    gapsMs: [300, 250, 200, 160], // between dives, quickening
    diveMs: 260, // each plunge
    holdMs: 450,
    mergeMs: 500,
  },
  // mix: src/floors/skiJumpEvent: a wisp skis a river of cash off a jump
  skiJumpEvent: {
    chance: 0.01,
    streamMs: 900, // the river pouring
    travelMs: 1_400, // the skier's (and each coin's) run, jump and landing
    holdMs: 300,
    mergeMs: 500,
  },
  // mix: src/floors/jetpackEvent: a wisp rides a jet of cash up into the total
  jetpackEvent: {
    chance: 0.01,
    flyMs: 1_500, // the climb to the total
    sweepMs: 250, // the pool erupting after it
    flightMs: 380, // each coin's flight up into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment: src/floors/bassDropEvent: beats, a snare roll, silence, drop
  bassDropEvent: {
    chance: 0.01,
    beatMs: 260, // between the heavy beats (the roll speeds up from half this)
    silenceMs: 220, // the dead beat before the drop
    holdMs: 450,
    mergeMs: 500,
  },
  // beam: src/floors/scannerEvent: a scan line reveals cash, then scoops it
  scannerEvent: {
    chance: 0.01,
    scanMs: 800, // the line sweeping down
    pauseMs: 120, // at the bottom
    sweepMs: 650, // sweeping back up into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // beam: src/floors/laserGridEvent: lasers build a grid, cash pops along them
  laserGridEvent: {
    chance: 0.01,
    gapMs: 200, // between lasers
    aimMs: 140, // each aim line flickering before it fires
    zipMs: 110, // each beam blazing from edge to edge
    flightMs: 380, // each coin's flight into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // beam: src/floors/etchEvent: a beam scrawls a trail of cash that runs home
  etchEvent: {
    chance: 0.01,
    etchMs: 1_000, // the beam scrawling
    pauseMs: 120, // before the trail runs
    runMs: 650, // the trail running into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // beam: src/floors/searchlightsEvent: searchlights catch stashes of cash
  searchlightsEvent: {
    chance: 0.01,
    searchMs: 1_300, // the lights sweeping
    lockMs: 280, // swinging round onto the total
    streamMs: 350, // each stash's geyser pouring
    travelMs: 500, // each coin's trip up a geyser
    holdMs: 350,
    mergeMs: 500,
  },
  // beam: src/floors/tractorBeamEvent: a beam lifts a spiral of cash up
  tractorBeamEvent: {
    chance: 0.01,
    aimMs: 260, // the beam flickering down
    openMs: 220, // blazing open
    liftMs: 900, // coins being lifted off the button
    riseMs: 550, // each coin's spiral up
    holdMs: 300,
    mergeMs: 500,
  },
  // beam: src/floors/beamClashEvent: two beams clash, then a geyser of cash
  beamClashEvent: {
    chance: 0.01,
    aimMs: 250, // the aim lasers flickering
    fireMs: 150, // the beams firing in to meet
    clashMs: 1_000, // the clash shoving back and forth
    overloadMs: 200, // overloading before they blow
    streamMs: 400, // the geyser pouring
    travelMs: 450, // each coin's trip up it
    holdMs: 300,
    mergeMs: 500,
  },
  // money: src/floors/butterflyEvent: mirrored rivers open into butterfly wings
  butterflyEvent: {
    chance: 0.01,
    streamMs: 900, // the rivers pouring
    travelMs: 1_300, // each coin's trip round a wing and up into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // money: src/floors/kelpEvent: stalks of cash grow, sway, then lean into the total
  kelpEvent: {
    chance: 0.01,
    growMs: 450, // each stalk growing
    swayMs: 500, // all of them swaying
    leanMs: 300, // leaning over onto the total
    flowMs: 650, // each coin's climb up a stalk
    holdMs: 300,
    mergeMs: 500,
  },
  // wisp: src/floors/pendulumWaveEvent: a row of pendulum wisps swing in waves
  pendulumWaveEvent: {
    chance: 0.01,
    swingMs: 1_400, // swinging
    fireMs: 280, // each wisp's flight into the total
    holdMs: 400,
    mergeMs: 500,
  },
  // wisp: src/floors/formationEvent: wisps snap through formations, then fire
  formationEvent: {
    chance: 0.01,
    snapMs: 170, // each snap into a formation
    holdShapeMs: 190, // holding it
    fireMs: 260, // each wisp's flight into the total
    holdMs: 400,
    mergeMs: 500,
  },
  // mix: src/floors/ouroborosEvent: a wisp closes a ring of cash, which spins in
  ouroborosEvent: {
    chance: 0.01,
    ringMs: 600, // the head running the first lap
    spinMs: 800, // the ring spinning up and shrinking
    collapseMs: 350, // collapsing into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // mix: src/floors/bowstringEvent: a wisp arrow drawn on a string of cash
  bowstringEvent: {
    chance: 0.01,
    stringMs: 450, // the string of cash forming
    drawMs: 750, // drawn back
    flightMs: 300, // the arrow's flight into the total
    flowMs: 500, // each coin's run along the string
    holdMs: 300,
    mergeMs: 500,
  },
  // beam: src/floors/superlaserEvent: beams converge, then one colossal shot
  superlaserEvent: {
    chance: 0.01,
    aimMs: 250, // the aim lasers flickering
    gapMs: 110, // between emitters firing
    chargeMs: 350, // the focus charging once every beam is in
    streamMs: 450, // the cash roaring up the shot
    travelMs: 450, // each coin's trip up it
    holdMs: 300,
    mergeMs: 500,
  },
  // beam: src/floors/ionStormEvent: beams stab down all over, then the button
  ionStormEvent: {
    chance: 0.01,
    aimMs: 120, // each aim line flickering before its beam
    gapsMs: [220, 70] as [number, number], // between strikes, quickening
    holdMs: 450,
    mergeMs: 500,
  },
  // experiment: src/floors/glitchEvent: the screen glitches, then reboots
  glitchEvent: {
    chance: 0.01,
    gapsMs: [260, 70] as [number, number], // between glitches, quickening
    holdMs: 450,
    mergeMs: 500,
  },
  // experiment: src/floors/magnifierEvent: a lens zooms in, cash bursts out
  magnifierEvent: {
    chance: 0.01,
    glideMs: 250, // gliding to each stop
    zoomMs: 300, // zooming in and out at a stop
    holdMs: 350,
    mergeMs: 500,
  },
  // money: src/floors/waterShowEvent: fountain jets of cash put on a show
  waterShowEvent: {
    chance: 0.01,
    actMs: 520, // between acts
    streamMs: 380, // each jet pouring
    travelMs: 480, // each coin's arc
    holdMs: 300,
    mergeMs: 500,
  },
  // money: src/floors/mercuryEvent: droplets of cash merge into one blob
  mercuryEvent: {
    chance: 0.01,
    spillMs: 380, // the droplets splashing out
    mergeGapMs: 110, // between merges
    slideMs: 240, // each pair sliding together
    flightMs: 380, // the blob shooting into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // wisp: src/floors/alignmentEvent: orbiting wisps line up, then fire
  alignmentEvent: {
    chance: 0.01,
    orbitMs: 1_500, // circling until they line up
    lineMs: 200, // lined up, blazing
    fireMs: 260, // each wisp's flight into the total
    holdMs: 400,
    mergeMs: 500,
  },
  // wisp: src/floors/dandelionEvent: a puff of seed wisps blown into the total
  dandelionEvent: {
    chance: 0.01,
    gatherMs: 700, // the puffball swelling
    tearGapMs: 50, // between seeds tearing off
    flightMs: 650, // each seed's flight
    holdMs: 400,
    mergeMs: 500,
  },
  // mix: src/floors/bobberEvent: a wisp rides a jet of cash that surges higher
  bobberEvent: {
    chance: 0.01,
    levelMs: 480, // between surges
    launchMs: 260, // the wisp fired into the total
    sweepMs: 250, // the pool erupting after it
    flightMs: 380, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix: src/floors/fishingEvent: a wisp lure cast on a line of cash
  fishingEvent: {
    chance: 0.01,
    castMs: 600, // the cast (and each coin's trip down the line)
    streamMs: 1_100, // the line paying out
    bitesMs: [300, 560], // bites, after it lands
    strikeMs: 300, // whipped up into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // beam: src/floors/scissorsEvent: beams open like scissors up to the total
  scissorsEvent: {
    chance: 0.01,
    swingMs: 320, // the blades swinging in to cross
    openMs: 1_200, // the blades swinging open
    holdMs: 400,
    mergeMs: 500,
  },
  // beam: src/floors/pulseRifleEvent: the button charges, then fires pulses
  pulseRifleEvent: {
    chance: 0.01,
    chargeMs: 700, // charging
    gapMs: 170, // between pulses
    boltMs: 220, // each pulse's flight into the total
    slugMs: 130, // the slug of cash each drags
    holdMs: 300,
    mergeMs: 500,
  },
  // experiment: src/floors/splitEvent: the screen splits open, then slams shut
  splitEvent: {
    chance: 0.01,
    crackMs: 300, // the crack zipping across
    openMs: 260, // the halves heaving apart
    gushMs: 700, // cash gushing out of the gap
    slamMs: 120, // slamming back together
    holdMs: 400,
    mergeMs: 500,
  },
  // experiment: src/floors/pixelateEvent: the screen pixelates, then snaps back
  pixelateEvent: {
    chance: 0.01,
    gapsMs: [340, 170] as [number, number], // between beats, quickening
    holdMs: 450,
    mergeMs: 500,
  },
  // money: src/floors/damBurstEvent: a cliff of cash bursts and floods across
  damBurstEvent: {
    chance: 0.01,
    fillMs: 1_000, // the heap piling up against the dam
    spreadMs: 220, // the flood front reaching the far side
    floodMs: 620, // each coin's flood across and up into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // money: src/floors/spiderwebEvent: spokes, then a spiral, of cash
  spiderwebEvent: {
    chance: 0.01,
    spokeGapMs: 70, // between spokes shooting out
    spokeStreamMs: 520, // each spoke pouring
    spokeTravelMs: 260, // each coin's trip out a spoke
    spiralStreamMs: 600, // the spiral pouring
    spiralTravelMs: 760, // each coin's trip round the spiral
    holdMs: 250,
    mergeMs: 500,
  },
  // money: src/floors/curtainEvent: a curtain of cash drops, opens, flies up
  curtainEvent: {
    chance: 0.01,
    dropMs: 420, // the curtain dropping
    hangMs: 260, // hanging, rippling
    openMs: 420, // drawn open to the sides
    sweepMs: 260, // the coins setting off for the total, top rows first
    flightMs: 420, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp: src/floors/jellyfishEvent: a wisp jellyfish pulses up into the total
  jellyfishEvent: {
    chance: 0.01,
    pulseGapsMs: [380, 220] as [number, number], // between pulses, quickening
    diveMs: 240, // the last dive into the total
    holdMs: 400,
    mergeMs: 500,
  },
  // wisp: src/floors/polarityEvent: a swarm snaps between two poles
  polarityEvent: {
    chance: 0.01,
    gatherMs: 320, // the swarm gathering on the first pole
    flipGapsMs: [360, 150] as [number, number], // between flips, quickening
    dashMs: 130, // the swarm's dash across
    slamMs: 200, // the poles slamming together
    holdMs: 400,
    mergeMs: 500,
  },
  // wisp: src/floors/colliderEvent: two wisps race round a ring and collide
  colliderEvent: {
    chance: 0.01,
    runMs: 1_400, // racing round the ring
    dashMs: 160, // dashing in to collide
    debrisMs: 320, // the debris flying out
    holdMs: 400,
    mergeMs: 500,
  },
  // mix: src/floors/sheepdogEvent: a wisp herds a spill of cash into the total
  sheepdogEvent: {
    chance: 0.01,
    spillMs: 380, // the cash spilling out
    dartGapsMs: [320, 190] as [number, number], // between darts, quickening
    squeezeMs: 220, // the herd squeezing after a dart
    sweepMs: 280, // the herd setting off for the total
    flightMs: 420, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix: src/floors/dragonEvent: a wisp head leads a rippling body of cash
  dragonEvent: {
    chance: 0.01,
    flightMs: 1_700, // the head's flight into the total
    bodyMs: 650, // how far behind the head the tail trails
    holdMs: 300,
    mergeMs: 500,
  },
  // beam: src/floors/reflectorEvent: a beam bounces mirror to mirror
  reflectorEvent: {
    chance: 0.01,
    popMs: 260, // the mirrors popping up
    aimMs: 260, // the aim laser flickering
    legsMs: [240, 120] as [number, number], // each leg of the beam, quickening
    streamMs: 380, // cash pouring down each leg
    travelMs: 260, // each coin's trip down a leg
    holdMs: 350,
    mergeMs: 500,
  },
  // beam: src/floors/cookieCutterEvent: a beam cuts a disc out of the screen
  cookieCutterEvent: {
    chance: 0.01,
    aimMs: 240, // the aim laser flickering
    cutMs: 900, // the beam cutting round
    liftMs: 380, // the disc flying into the total
    holdMs: 400,
    mergeMs: 500,
  },
  // experiment: src/floors/cinematicEvent: letterbox bars and punch-in zooms
  cinematicEvent: {
    chance: 0.01,
    barsMs: 180, // the bars slamming in
    punchGapsMs: [360, 220] as [number, number], // between punches, quickening
    punchMs: 110, // each zoom punching in
    holdMs: 450,
    mergeMs: 500,
  },
  // experiment: src/floors/negativeEvent: the screen strobes to a negative
  negativeEvent: {
    chance: 0.01,
    gapsMs: [300, 90] as [number, number], // between flips, quickening
    holdMs: 450,
    mergeMs: 500,
  },
  // beam, levels + worker tiers: src/floors/chainLightningEvent: lightning
  // forks from bar to worker to bar
  chainLightningEvent: {
    chance: 0.01,
    gapsMs: [300, 110] as [number, number], // between strikes, quickening
    boltMs: 170, // each bolt crackling
    finaleMs: 280, // the whole chain blazing at once
    levelShare: 0.12, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
  // beam, worker tiers: src/floors/lockOnEvent: an aim laser locks on and fires
  lockOnEvent: {
    chance: 0.01,
    huntsMs: [420, 180] as [number, number], // hunting each target, quickening
    fireMs: 120, // each shot
    volleyMs: 260, // every beam blazing at once at the end
    holdMs: 600,
    mergeMs: 0,
  },
  // mix, cash + levels: src/floors/stitchEvent: a river of cash threads the bars
  stitchEvent: {
    chance: 0.01,
    travelMs: 1_300, // the needle's run through every bar
    streamMs: 700, // the river pouring after it
    levelShare: 0.1, // of each bar's levels
    holdMs: 400,
    mergeMs: 500,
  },
  // money, cash + levels + tier: src/floors/stockpileEvent: cash heaps on bars
  stockpileEvent: {
    chance: 0.01,
    rainMs: 800, // the cash raining down onto the bars
    soakMs: 160, // each heap sinking into its bar
    gapMs: 140, // between heaps sinking
    eruptMs: 300, // the cash bursting back out of each bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, tier + levels: src/floors/spotWeldEvent: two beams weld a bar
  spotWeldEvent: {
    chance: 0.01,
    aimMs: 240, // the aim lasers flickering
    weldMs: 1_100, // the beams welding in from both ends
    levelShare: 0.04, // of the bar's levels, per quarter welded
    holdMs: 700,
    mergeMs: 0,
  },
  // experiment, a surprise reward: src/floors/reelsEvent: the screen spins
  // like three slot reels
  reelsEvent: {
    chance: 0.01,
    stopsMs: [700, 1_000, 1_350], // each reel stopping
    levelShare: 0.15, // of each bar's levels, when it pays levels
    holdMs: 700,
    mergeMs: 500,
  },
  // money, worker tiers + cash: src/floors/cashShowerEvent: a column of cash
  // showers down onto worker after worker
  cashShowerEvent: {
    chance: 0.01,
    gapsMs: [300, 140] as [number, number], // between showers, quickening
    streamMs: 280, // each shower pouring
    travelMs: 220, // each coin's fall
    holdMs: 400,
    mergeMs: 500,
  },
  // money, cash: src/floors/catherineWheelEvent: the button spins like a
  // firework wheel, spraying four jets of cash into spiral arms
  catherineWheelEvent: {
    chance: 0.01,
    spinMs: 1_400, // spraying, ever faster
    spinRate: [0.004, 0.02] as [number, number], // rad per ms, speeding up
    outMs: 520, // each coin flying out along its arm
    flightMs: 380, // each coin's flight on into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, levels: src/floors/multiballEvent: three balls pinball off the bars
  multiballEvent: {
    chance: 0.01,
    playMs: 1_500, // pinballing round the screen
    slamMs: 200, // all three diving into the clicked floor's bar
    levelShare: 0.03, // of a bar's levels, per bounce
    holdMs: 700,
    mergeMs: 0,
  },
  // money, cash + levels: src/floors/avalancheEvent: a torrent of cash roars
  // down the screen, burying the bars
  avalancheEvent: {
    chance: 0.01,
    streamMs: 900, // the cash breaking loose
    fallMs: 700, // each coin's slide down
    drainMs: 300, // the heap setting off for the total
    flightMs: 420, // each coin's flight into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 200,
    mergeMs: 500,
  },
  // wisp, worker tiers: src/floors/beehiveEvent: a swarm buzzes worker to worker
  beehiveEvent: {
    chance: 0.01,
    flightsMs: [360, 200] as [number, number], // swooping to each worker
    buzzesMs: [320, 160] as [number, number], // whirling on each head
    burstMs: 300, // the swarm bursting outward
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, cash + levels: src/floors/pogoEvent: a wisp pogos bar to bar on a
  // jet of cash
  pogoEvent: {
    chance: 0.01,
    hopsMs: [420, 230] as [number, number], // each hop, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, levels: src/floors/laserHarpEvent: a wisp plucks laser strings
  laserHarpEvent: {
    chance: 0.01,
    igniteMs: 300, // the strings shooting up
    entryMs: 220, // the wisp swooping in
    gapsMs: [170, 70] as [number, number], // between plucks, quickening
    finaleMs: 300, // every string blazing at once
    levelShare: 0.05, // of a bar's levels, per pluck
    holdMs: 600,
    mergeMs: 0,
  },
  // lightning, levels + tier: src/floors/lichtenbergEvent: a branching tree of
  // lightning grows down onto the bars
  lichtenbergEvent: {
    chance: 0.01,
    limbsMs: [360, 150] as [number, number], // each trunk step and its branch
    dischargeMs: 320, // the whole tree blazing at once
    levelShare: 0.1, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
  // shatter, cash: src/floors/shatterEvent: the screen shatters like glass
  shatterEvent: {
    chance: 0.01,
    knocksMs: [180, 520, 820], // each knock, the last shattering it
    fallMs: 900, // the shards blowing out and falling away
    holdMs: 200,
    mergeMs: 500,
  },
  // money, cash + levels + tier: src/floors/funnelEvent: cash funnels down
  // into the clicked floor's bar
  funnelEvent: {
    chance: 0.01,
    streamMs: 1_000, // cash pouring in
    fallMs: 650, // each coin's fall down the funnel
    levelShare: 0.04, // of the bar's levels, per gulp
    holdMs: 300,
    mergeMs: 500,
  },
  // wisp, levels: src/floors/grappleEvent: a wisp swings bar to bar
  grappleEvent: {
    chance: 0.01,
    swingsMs: [520, 300] as [number, number], // each swing, quickening
    slamMs: 150, // after letting go of the last bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
  // mix, cash: src/floors/surfEvent: a wisp surfs a wave of cash
  surfEvent: {
    chance: 0.01,
    rollMs: 1_500, // the wave rolling across
    drainMs: 300, // the wave breaking into the total
    flightMs: 420, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, worker tiers: src/floors/laserTagEvent: workers tag each other
  laserTagEvent: {
    chance: 0.01,
    gapsMs: [260, 110] as [number, number], // between tags, quickening
    aimMs: 140, // each aim line flickering
    fireMs: 160, // each beam blazing
    volleyMs: 300, // every worker firing at once
    holdMs: 600,
    mergeMs: 0,
  },
  // lightning, levels + worker tiers: src/floors/ballLightningEvent: a ball
  // of lightning careens round zapping bars and workers
  ballLightningEvent: {
    chance: 0.01,
    legsMs: [380, 190] as [number, number], // each swerve to a target
    diveMs: 200, // diving into the clicked floor's bar
    levelShare: 0.1, // of a bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
  // shatter, levels + tier: src/floors/eventHorizonEvent: the shards are
  // sucked into the clicked floor's bar
  eventHorizonEvent: {
    chance: 0.01,
    knocksMs: [200, 480, 700, 900], // each knock, the last shattering it
    pullMs: 750, // the shards sucked in
    levelShare: 0.06, // of the bar's levels, per knock
    holdMs: 600,
    mergeMs: 0,
  },
  // money, cash + an unlock: src/floors/gusherEvent: a jet of cash fills the
  // locked floor
  gusherEvent: {
    chance: 0.01,
    streamMs: 1_000, // the jet gushing
    riseMs: 600, // each coin's trip up and into the tank
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, cash: src/floors/pinataEvent: wisps whack a swinging wisp piñata
  pinataEvent: {
    chance: 0.01,
    dropMs: 280, // the piñata dropping in
    gapsMs: [220, 90] as [number, number], // between whacks, quickening
    holdMs: 300,
    mergeMs: 500,
  },
  // mix, worker tiers + cash: src/floors/giftWrapEvent: a ribbon of cash
  // loops round the workers
  giftWrapEvent: {
    chance: 0.01,
    travelMs: 1_700, // the wisp's run round every worker and up
    streamMs: 900, // the ribbon pouring after it
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, levels + tier: src/floors/triangulateEvent: three lasers lock onto bars
  triangulateEvent: {
    chance: 0.01,
    huntsMs: [420, 200] as [number, number], // hunting each bar, quickening
    fireMs: 150, // the three beams firing
    levelShare: 0.1, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
  // lightning, hires: src/floors/sparkOfLifeEvent: bolts bring new workers to life
  sparkOfLifeEvent: {
    chance: 0.01,
    chargeMs: 450, // sparks crackling before the first bolt
    gapsMs: [360, 180] as [number, number], // between bolts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // shatter, levels: src/floors/glassRainEvent: the shards rain down past the bars
  glassRainEvent: {
    chance: 0.01,
    knocksMs: [180, 450, 680], // each knock, the last shattering it
    fallMs: 1_000, // the glass raining down
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/foldEvent: the screen folds up like paper
  foldEvent: {
    chance: 0.01,
    foldMs: 320, // each fold
    gapMs: 180, // between the folds
    holdOpenMs: 220, // folded up, before springing open
    holdMs: 300,
    mergeMs: 500,
  },
  // money, hires + cash: src/floors/cocoonEvent: cash whirls into cocoons that
  // burst into new workers
  cocoonEvent: {
    chance: 0.01,
    streamMs: 900, // the cash pouring in
    flyMs: 450, // each coin's flight into its cocoon
    gapMs: 220, // between the cocoons bursting
    flingMs: 300, // a burst cocoon's cash flying out
    holdMs: 300,
    mergeMs: 500,
  },
  // wisp, levels: src/floors/gravityAssistEvent: a wisp slingshots round the bars
  gravityAssistEvent: {
    chance: 0.01,
    flightMs: 1_900, // the whole flight, speeding up
    levelShare: 0.1, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
  // mix, cash + levels: src/floors/zipLineEvent: wisps zip down lines of cash
  // from the total onto the bars
  zipLineEvent: {
    chance: 0.01,
    zipsMs: [480, 260] as [number, number], // each zip, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, an unlock: src/floors/breachEvent: two beams cut the locked floor open
  breachEvent: {
    chance: 0.01,
    aimMs: 300, // the aim lasers flickering
    cutMs: 1_200, // the beams cutting round, speeding up
    holdMs: 400,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/stormSurgeEvent: bolts strike a river of cash
  stormSurgeEvent: {
    chance: 0.01,
    streamMs: 1_100, // the river pouring
    travelMs: 1_400, // each coin's run along the river
    holdMs: 250,
    mergeMs: 500,
  },
  // shatter, cash: src/floors/smashAndGrabEvent: the shards fly into the total
  smashAndGrabEvent: {
    chance: 0.01,
    knocksMs: [180, 460, 720], // each knock, the last shattering it
    grabMs: 700, // from the nearest shard set off to the farthest
    flyMs: 380, // each shard's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, a crit tier: src/floors/shrinkRayEvent: the screen shrinks away
  shrinkRayEvent: {
    chance: 0.01,
    zapsMs: [250, 580, 860], // each zap
    smallMs: 320, // shrunk to a speck, before springing back
    popMs: 260, // springing back to full size
    holdMs: 500,
    mergeMs: 0,
  },
  // money, worker tiers + cash: src/floors/sandstormEvent: a storm of cash
  // blows across the screen, over the workers
  sandstormEvent: {
    chance: 0.01,
    streamMs: 800, // the storm blowing in
    crossMs: 650, // a coin's run across, at its base speed
    flightMs: 350, // whirling up into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, levels + a crit tier: src/floors/juggernautEvent: a swelling wisp
  // careens wall to wall down onto the clicked bar
  juggernautEvent: {
    chance: 0.01,
    legsMs: [420, 180] as [number, number], // each wall-to-wall leg, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 600,
    mergeMs: 0,
  },
  // mix, a crit tier + levels + cash: src/floors/fuelLineEvent: a hose of
  // cash pumps into the clicked bar
  fuelLineEvent: {
    chance: 0.01,
    plugMs: 500, // the wisp diving down with the hose
    fillMs: 300, // the hose filling behind it
    pumpGapsMs: [380, 220] as [number, number], // between pumps, quickening
    pumpTravelMs: 260, // each slug's run down the hose
    pulseMs: 140, // each slug's length
    levelShare: 0.1, // of the bar's levels, per pump
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, levels + cash: src/floors/checkoutEvent: a scan beam sweeps each bar
  checkoutEvent: {
    chance: 0.01,
    hopMs: 160, // the scanner hopping to its next bar
    scansMs: [340, 180] as [number, number], // each sweep, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
  // lightning, an unlock: src/floors/lightningRodEvent: bolts charge the
  // locked floor till it bursts open
  lightningRodEvent: {
    chance: 0.01,
    gapsMs: [320, 140] as [number, number], // between strikes, quickening
    finalGapMs: 300, // the last strike to the colossal bolt
    holdMs: 400,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/flagEvent: the screen ripples like a flag
  flagEvent: {
    chance: 0.01,
    waveMs: 1_900, // the ripple growing, then snapping straight
    gusts: 5, // crests flinging cash
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/terracesEvent: cash spills bar to bar
  terracesEvent: {
    chance: 0.01,
    pourMs: 500, // the column from the sky onto the top bar
    fallsMs: [380, 220] as [number, number], // each spill onto the next bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
  // wisp, an unlock: src/floors/batteringRamEvent: a wisp rams the locked floor
  batteringRamEvent: {
    chance: 0.01,
    swoopMs: 350, // swooping in under the floor
    drawsMs: [320, 200] as [number, number], // each draw-back, quickening
    strikeMs: 110, // each ram up into the floor
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, levels + a crit tier + cash: src/floors/tetherballEvent: a wisp on a
  // rope of cash winds round the clicked bar
  tetherballEvent: {
    chance: 0.01,
    launchMs: 250, // flying out to the rope's length
    spinMs: 1_500, // winding in, ever faster
    levelShare: 0.1, // of the bar's levels, per lap
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, free hires: src/floors/projectorEvent: beams project new workers
  projectorEvent: {
    chance: 0.01,
    riseMs: 300, // the lens rising off the button
    aimMs: 150, // each aim laser
    beamsMs: [340, 180] as [number, number], // each projection, quickening
    holdMs: 400,
    mergeMs: 0,
  },
  // lightning, levels + a crit tier: src/floors/clearEvent: paddles shock the
  // clicked bar
  clearEvent: {
    chance: 0.01,
    swoopMs: 300, // the paddles swooping in
    chargesMs: [600, 380] as [number, number], // each charge-up, quickening
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/infinityMirrorEvent: the screen nests in itself
  infinityMirrorEvent: {
    chance: 0.01,
    diveMs: 1_600, // diving in through the copies, speeding up
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/elevatorEvent: a column of cash climbs a
  // shaft, branching into every bar
  elevatorEvent: {
    chance: 0.01,
    riseMs: 1_300, // the column climbing to the top bar
    branchMs: 260, // each branch's run into its bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
  // wisp, free hires: src/floors/migrationEvent: a V of wisps drops hires
  migrationEvent: {
    chance: 0.01,
    crossMs: 2_000, // the flock crossing the screen
    firstPeelMs: 500, // the first bird peeling off
    peelGapsMs: [380, 220] as [number, number], // between peels, quickening
    diveMs: 320, // each bird's swoop onto its spot
    holdMs: 400,
    mergeMs: 0,
  },
  // mix, an unlock + cash: src/floors/corkscrewEvent: a wisp corkscrews up to
  // the locked floor trailing cash
  corkscrewEvent: {
    chance: 0.01,
    climbMs: 900, // corkscrewing up the building
    orbitMs: 900, // whirling round the locked floor, ever tighter
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, worker tiers: src/floors/mirrorBallEvent: wheeling beams over workers
  mirrorBallEvent: {
    chance: 0.01,
    dropMs: 300, // the ball dropping in
    spinMs: 1_500, // the beams wheeling round, speeding up
    holdMs: 400,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/plasmaGlobeEvent: tendrils draw cash into a core
  plasmaGlobeEvent: {
    chance: 0.01,
    writheMs: 1_700, // the tendrils writhing, before they whip onto the total
    pulses: 5, // flares spraying coins
    flowMs: 500, // each coin's crawl down a tendril
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, cash: src/floors/jellyEvent: the screen wobbles like jelly
  jellyEvent: {
    chance: 0.01,
    thumpsMs: [150, 550, 850, 1_080], // each thump from the button
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/shockwaveEvent: rings of cash ripple out
  // of the button over the bars
  shockwaveEvent: {
    chance: 0.01,
    gapsMs: [380, 240] as [number, number], // between rings, quickening
    expandMs: 650, // each ring racing out to the edges
    flightMs: 450, // the cash surging back into the total
    levelShare: 0.04, // of each bar's levels, per ring
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, worker tiers: src/floors/passTheParcelEvent: workers toss a wisp on
  passTheParcelEvent: {
    chance: 0.01,
    tossesMs: [420, 200] as [number, number], // each toss, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, free hires + cash: src/floors/gardenHoseEvent: a jet of cash waters
  // empty spots into new workers
  gardenHoseEvent: {
    chance: 0.01,
    swingMs: 160, // the jet swinging onto its next aim
    dwellsMs: [260, 140] as [number, number], // soaking each spot, quickening
    flightMs: 380, // each coin's arc
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, levels + a crit tier: src/floors/burningGlassEvent: focused light
  // scorches the bars and ignites the clicked one
  burningGlassEvent: {
    chance: 0.01,
    focusMs: 350, // the shaft narrowing to a point
    legsMs: [340, 200] as [number, number], // hunting to each bar, quickening
    igniteMs: 450, // focusing down on the clicked bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, worker tiers + levels: src/floors/stormFrontEvent: a wall of
  // lightning marches across the screen
  stormFrontEvent: {
    chance: 0.01,
    sweepMs: 1_700, // the front crossing, speeding up
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/slidePuzzleEvent: the screen as a slide puzzle
  slidePuzzleEvent: {
    chance: 0.01,
    slidesMs: [150, 80] as [number, number], // each slide, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + a crit tier + cash: src/floors/whirlpoolEvent: cash
  // spirals into the clicked bar
  whirlpoolEvent: {
    chance: 0.01,
    streamMs: 1_200, // the rivers pouring in
    spiralMs: 700, // each coin's spiral in
    levelShare: 0.1, // of the bar's levels, per gulp
    holdMs: 300,
    mergeMs: 500,
  },
  // wisp, levels: src/floors/satellitesEvent: wisps skim the bars into orbit
  satellitesEvent: {
    chance: 0.01,
    launchGapsMs: [300, 160] as [number, number], // between launches, quickening
    approachMs: 420, // each one's run in through its bar to its ring
    circleMs: 400, // all of them circling
    collapseMs: 300, // the orbits decaying onto the button
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, worker tiers + cash: src/floors/typewriterEvent: a wisp types rows of
  // cash through the workers
  typewriterEvent: {
    chance: 0.01,
    linesMs: [520, 300] as [number, number], // each line typed, quickening
    returnMs: 140, // each carriage return
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, cash: src/floors/railgunEvent: rails build up and fire a slug of cash
  railgunEvent: {
    chance: 0.01,
    buildsMs: [220, 110] as [number, number], // each section, quickening
    chargeMs: 350, // crackling before it fires
    fireMs: 160, // the slug's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, levels + a crit tier: src/floors/thunderdomeEvent: a cage of
  // lightning snaps shut on the clicked bar
  thunderdomeEvent: {
    chance: 0.01,
    formMs: 250, // the cage cracking into being
    holdsMs: [380, 200] as [number, number], // between snaps, quickening
    levelShare: 0.1, // of the bar's levels, per snap
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/meltEvent: the screen melts like wax
  meltEvent: {
    chance: 0.01,
    meltMs: 1_700, // sagging, before it snaps back
    drips: 5, // cash dripping off the deepest sag
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/floodEvent: a flood of cash rises up the
  // screen over the bars
  floodEvent: {
    chance: 0.01,
    riseMs: 1_300, // the surface rising, speeding up
    drainMs: 300, // from the top layer to the bottom setting off
    flightMs: 400, // each coin's surge into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, worker tiers + a crit tier: src/floors/piedPiperEvent: a wisp leads
  // a growing train past the workers into the clicked bar
  piedPiperEvent: {
    chance: 0.01,
    leadMs: 1_500, // the piper's run from the button to the bar
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, an unlock + cash: src/floors/tentaclesEvent: tentacles of cash rip
  // the locked floor open
  tentaclesEvent: {
    chance: 0.01,
    riseMs: 300, // the wisp rising under the floor
    gapsMs: [220, 120] as [number, number], // between tentacles, quickening
    reachMs: 300, // each tentacle's lash up to its grip
    heaveMs: 400, // all of them heaving before it rips
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, levels + a crit tier: src/floors/laserPendulumEvent: a swinging
  // beam slices the bars
  laserPendulumEvent: {
    chance: 0.01,
    swingMs: 1_500, // swinging, ever wider
    periodsMs: [800, 450] as [number, number], // each swing, quickening
    lockMs: 220, // whipping round onto the clicked bar
    levelShare: 0.05, // of each bar's levels, per slice
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/electricEelEvent: an eel of cash crackles
  // across the screen
  electricEelEvent: {
    chance: 0.01,
    swimMs: 1_500, // swimming across in S-waves
    diveMs: 300, // diving into the total
    discharges: 4, // its body flaring and lashing bolts
    holdMs: 200,
    mergeMs: 500,
  },
  // experiment, cash: src/floors/doubleVisionEvent: the screen seen double
  doubleVisionEvent: {
    chance: 0.01,
    lurchesMs: [100, 420, 700, 940, 1_140], // each lurch apart
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/honeyEvent: a thread of cash drizzles
  // down like honey, coiling into heaps on the bars
  honeyEvent: {
    chance: 0.01,
    poursMs: [520, 320] as [number, number], // each heap, quickening
    swingMs: 110, // the thread swinging on to the next heap
    settleMs: 100, // the last coins landing before the heaps lift
    flightMs: 350, // each coin's slurp into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, worker tiers + a crit tier: src/floors/musicalChairsEvent: wisps race
  // round the workers and scramble for them when the music stops
  musicalChairsEvent: {
    chance: 0.01,
    circleMs: 1_100, // racing round, ever faster
    dashMs: 220, // each wisp's dive onto its worker
    outMs: 260, // the odd one out's dive into the clicked bar
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, hires + cash: src/floors/bubbleWandEvent: a wisp blows bubbles of
  // cash that pop into new workers
  bubbleWandEvent: {
    chance: 0.01,
    riseMs: 220, // the wand floating up
    gapsMs: [300, 180] as [number, number], // between bubbles, quickening
    inflateMs: 240, // each bubble swelling out of the wand
    floatMs: 380, // each bubble drifting to its spot
    popMs: 260, // the cash flung out of a pop
    diveMs: 280, // the wand diving into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, cash: src/floors/hyperspaceEvent: stars of light and cash streak out
  // at light speed, then snap back and fire into the total
  hyperspaceEvent: {
    chance: 0.01,
    chargeMs: 400, // stars drifting out before the jump
    warpMs: 900, // streaking, ever faster
    dropMs: 200, // every streak snapping back into the button
    fireMs: 280, // the beam into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, levels + a crit tier: src/floors/javelinEvent: bolts hurled
  // like javelins stick in the bars, then discharge
  javelinEvent: {
    chance: 0.01,
    gapsMs: [420, 240] as [number, number], // between throws, quickening
    flyMs: 150, // each javelin's flight
    chargeMs: 320, // crackling before they all discharge
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/shuffleEvent: the screen riffled like a deck
  shuffleEvent: {
    chance: 0.01,
    cutMs: 180, // the halves pulling apart
    rifflesMs: [600, 420] as [number, number], // each riffle, quicker
    squareMs: 160, // the deck squaring back up
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/mushroomCloudEvent: a column of cash
  // billows up into a rolling mushroom cap
  mushroomCloudEvent: {
    chance: 0.01,
    fallMs: 350, // the wisp plummeting onto the button
    riseMs: 800, // the cap shooting up the screen
    billowMs: 450, // churning ever faster at the top
    flightMs: 380, // each coin's suck into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, levels + a crit tier: src/floors/relayEvent: wisp runners sprint
  // the bars, passing a baton
  relayEvent: {
    chance: 0.01,
    legsMs: [440, 260] as [number, number], // each leg's sprint, quickening
    tossMs: 140, // each baton toss
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, worker tiers: src/floors/laserPointerEvent: wisp kittens chase a
  // laser dot onto the workers
  laserPointerEvent: {
    chance: 0.01,
    dartsMs: [180, 100] as [number, number], // each dart of the dot, quickening
    holdsMs: [80, 20] as [number, number], // the dot staying on a worker after the pounce
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, worker tiers + levels + a crit tier: src/floors/stormChaserEvent:
  // bolts crack down on a fleeing wisp's heels
  stormChaserEvent: {
    chance: 0.01,
    runMs: 1_700, // the wisp's run, picking up speed
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, cash: src/floors/baitBallEvent: wisp hunters slash through a milling
  // shoal of cash
  baitBallEvent: {
    chance: 0.01,
    formMs: 450, // the shoal balling up mid-screen
    slashesMs: [700, 1_000, 1_220], // each hunter crossing its middle
    dashMs: 260, // each hunter's dash across the screen
    flightMs: 380, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, cash: src/floors/videoWallEvent: the screen tiled into a wall
  // of copies of itself
  videoWallEvent: {
    chance: 0.01,
    beatsMs: [120, 420, 680, 900], // each punch out to a bigger wall
    zoomMs: 280, // the button's screen zooming back to fill the view
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/ferrofluidEvent: a pool of cash bristles
  // into spikes that stab up into the bars
  ferrofluidEvent: {
    chance: 0.01,
    pourMs: 350, // the button gushing out the pool
    gapsMs: [260, 160] as [number, number], // between spikes, quickening
    stabMs: 200, // each spike shooting up into its bar
    slumpMs: 180, // the spikes slumping back into the pool
    flightMs: 380, // each coin's surge into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, worker tiers: src/floors/hideAndSeekEvent: wisps hide behind the
  // workers and a seeker hunts them down
  hideAndSeekEvent: {
    chance: 0.01,
    hideMs: 300, // the hiders scattering
    countMs: 450, // the seeker counting down on the button
    dashesMs: [300, 160] as [number, number], // each dash to a hider, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, cash: src/floors/magicCarpetEvent: a wisp rides a rippling carpet of
  // cash round the screen
  magicCarpetEvent: {
    chance: 0.01,
    unrollMs: 300, // the carpet unrolling under the rider
    flyMs: 1_500, // swooping round, picking up speed
    pileMs: 400, // the carpet piling into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, levels: src/floors/spirographEvent: a beam strung between two
  // whirling wisps traces a rosette
  spirographEvent: {
    chance: 0.01,
    enterMs: 250, // the wisps flying out onto their rings
    whirlMs: 1_300, // whirling, ever faster
    collapseMs: 250, // spiralling into the middle
    levelShare: 0.04, // of each bar's levels, per sweep
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, worker tiers + levels + a crit tier: src/floors/electricNetEvent:
  // a net of lightning drops over the screen and cinches on the clicked bar
  electricNetEvent: {
    chance: 0.01,
    dropMs: 1_100, // the net falling, speeding up
    cinchMs: 300, // cinching shut round the clicked bar
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, an unlock: src/floors/demolitionEvent: bomb wisps on the
  // locked floor's corners blow it open
  demolitionEvent: {
    chance: 0.01,
    flyMs: 300, // each charge flying to its corner
    fuseMs: 700, // the fuses burning down
    gapMs: 110, // between the corner blasts
    finalGapMs: 220, // the last corner to the colossal middle charge
    holdMs: 300,
    mergeMs: 0,
  },
  // gunfire, hires: src/floors/shootingGalleryEvent: a gun shoots down
  // sliding targets over the empty spots
  shootingGalleryEvent: {
    chance: 0.01,
    popMs: 250, // the targets popping up
    burstsMs: [300, 160] as [number, number], // before each burst, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/collapseEvent: the screen's storeys collapse
  // into a heap and spring back
  collapseEvent: {
    chance: 0.01,
    gapsMs: [240, 110] as [number, number], // between storeys giving way
    fallMs: 200, // each storey's drop
    springMs: 260, // springing back up
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/volcanoEvent: the button erupts a fountain of
  // cash and lobs lava bombs of it across the screen
  volcanoEvent: {
    chance: 0.01,
    eruptMs: 900, // the fountain roaring
    bombGapsMs: [240, 140] as [number, number], // between bombs, quickening
    lobMs: 420, // each bomb's flight
    flightMs: 380, // each coin's surge into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, hires: src/floors/skydiversEvent: wisps free-fall into a ring, then
  // break off and parachute onto empty spots
  skydiversEvent: {
    chance: 0.01,
    fallMs: 650, // free-falling into the ring
    holdLinkMs: 180, // falling linked up
    divesMs: [260, 380] as [number, number], // each diver's plunge to its chute
    floatMs: 320, // floating down under the chute
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, cash: src/floors/speedboatEvent: a wisp speedboat carves S-turns
  // trailing a V-shaped wake of cash
  speedboatEvent: {
    chance: 0.01,
    runMs: 1_500, // carving across, picking up speed
    flightMs: 380, // each wake coin's wash into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, levels + a crit tier: src/floors/peacockEvent: a fan of beams
  // unfurls from the button and snaps shut on the clicked bar
  peacockEvent: {
    chance: 0.01,
    opensMs: [150, 70] as [number, number], // between ribs opening, quickening
    snapMs: 160, // each rib snapping open
    shimmerMs: 250, // the open fan shimmering
    shutMs: 180, // snapping shut onto the clicked bar
    levelShare: 0.05, // of each bar's levels, per rib
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, crit tiers: src/floors/stormWingsEvent: a wisp on wings of
  // lightning beats bolts down onto the bars
  stormWingsEvent: {
    chance: 0.01,
    flyMs: 1_400, // flying over the bars
    diveMs: 260, // diving into the clicked bar
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, worker tiers: src/floors/clusterBombEvent: a bomb bursts into
  // bomblets that blow up on the workers
  clusterBombEvent: {
    chance: 0.01,
    lobMs: 600, // the bomb's lob up to its burst
    scatterMs: 380, // the first bomblet's fall
    staggerMs: 90, // between bomblets landing
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, levels: src/floors/strafingRunEvent: a gunship rakes the bars
  // with wisp bullets pass after pass
  strafingRunEvent: {
    chance: 0.01,
    passesMs: [420, 260] as [number, number], // each pass, quickening
    turnMs: 140, // each hairpin between passes
    levelShare: 0.1, // of each bar's levels
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/stainedGlassEvent: the screen turns into a
  // stained-glass window that light floods through
  stainedGlassEvent: {
    chance: 0.01,
    leadMs: 250, // the leading creeping over the screen
    shineMs: 1_000, // light flooding pane after pane
    blazeMs: 280, // the window blazing white and clearing
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/uprisingEvent: walls of cash climb the
  // screen's sides and crash together at the top
  uprisingEvent: {
    chance: 0.01,
    riseMs: 1_000, // the walls climbing, ever faster
    curlMs: 300, // curling over to meet in the middle
    flightMs: 380, // each coin's pour into the total
    levelShare: 0.1, // of each bar's levels
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, worker tiers: src/floors/swingRideEvent: riders whirl out on a
  // swing ride and are flung onto the workers
  swingRideEvent: {
    chance: 0.01,
    spinMs: 1_100, // spinning up
    snapsMs: [160, 90] as [number, number], // between chains snapping, quickening
    flyMs: 320, // each rider's flight onto its worker
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, cash: src/floors/lawnmowerEvent: a wisp mows stripes of cash across
  // the screen
  lawnmowerEvent: {
    chance: 0.01,
    stripesMs: [280, 160] as [number, number], // each stripe, quickening
    turnMs: 90, // each turn down into the next stripe
    diveMs: 200, // the mower diving into the total
    flightMs: 340, // each coin's rake into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, cash: src/floors/lightShowEvent: emitters along the bottom put on a
  // concert laser show
  lightShowEvent: {
    chance: 0.01,
    beatsMs: [200, 480, 730, 950, 1_150, 1_330], // each change; the last locks on the total
    lockMs: 260, // the beams burning into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, levels + a crit tier: src/floors/bugZapperEvent: the clicked
  // bar zaps wisp bugs that fly near it
  bugZapperEvent: {
    chance: 0.01,
    flyMs: 450, // each bug's flight in
    gapsMs: [200, 80] as [number, number], // between zaps, quickening
    levelShare: 0.03, // of the bar's levels, per zap
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, an unlock: src/floors/firecrackersEvent: a string of
  // firecrackers pops up the screen to a banger on the locked floor
  firecrackersEvent: {
    chance: 0.01,
    runMs: 1_300, // the spark racing up the string
    fuseMs: 350, // the banger fizzing before it blows
    holdMs: 300,
    mergeMs: 0,
  },
  // gunfire, hires: src/floors/sixShooterEvent: ricochet shots onto empty
  // spots, each a new worker
  sixShooterEvent: {
    chance: 0.01,
    drawMs: 250, // the gunslinger rising
    gapsMs: [220, 110] as [number, number], // between shots, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/thermalEvent: the screen seen through a
  // thermal camera
  thermalEvent: {
    chance: 0.01,
    washMs: 250, // washing into the thermal image
    flaresMs: 1_000, // the hot spots flaring, ever faster
    overheatMs: 280, // overheating white and snapping back
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/stalactitesEvent: cash drips into
  // stalactites that break off onto the bars
  stalactitesEvent: {
    chance: 0.01,
    growMs: 500, // the stalactites growing
    gapsMs: [260, 120] as [number, number], // between falls, quickening
    fallMs: 300, // each one's fall
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.04, // of the bar's levels, per hit
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/kintsugiEvent: cracks across the bars
  // fill with gold
  kintsugiEvent: {
    chance: 0.01,
    crackMs: 550, // each seam filling
    gapMs: 180, // between seams starting
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per seam
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/galaxyEvent: cash swirls into a spiral galaxy
  galaxyEvent: {
    chance: 0.01,
    formMs: 600, // the arms forming
    spinMs: 900, // spinning up before it collapses
    flightMs: 450, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/snowdriftEvent: cash drifts pile up on
  // the bars
  snowdriftEvent: {
    chance: 0.01,
    pileMs: 500, // the drifts piling up
    gapsMs: [260, 120] as [number, number], // between bars, quickening
    flyMs: 300, // each drift blowing onto its bar
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per drift
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, levels + a crit tier: src/floors/snowballEvent: a snowballing wisp
  // rolls down over the bars
  snowballEvent: {
    chance: 0.01,
    rollsMs: [400, 220] as [number, number], // each roll, quickening
    dropMs: 300, // each drop to the next bar
    levelShare: 0.05, // of the bar's levels, per roll
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/cartwheelEvent: a wheel of wisps cartwheels
  // across the screen
  cartwheelEvent: {
    chance: 0.01,
    hopsMs: [320, 180] as [number, number], // each hop, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, hires: src/floors/matryoshkaEvent: a nesting doll wisp opens doll
  // after doll onto empty spots
  matryoshkaEvent: {
    chance: 0.01,
    dropMs: 350, // the doll dropping in
    opensMs: [300, 160] as [number, number], // between openings, quickening
    flyMs: 300, // each child's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, hires + cash: src/floors/salmonRunEvent: wisps leap up a river of
  // cash like salmon
  salmonRunEvent: {
    chance: 0.01,
    pourMs: 400, // the river pouring
    startsMs: 300, // the first leap
    leapMs: 450, // each leap
    arcMs: 400, // each salmon's arc onto its spot
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, levels + cash: src/floors/moonTideEvent: a moon wisp pulls a tide
  // of cash up the screen
  moonTideEvent: {
    chance: 0.01,
    riseMs: 500, // the moon rising
    pullMs: 900, // the tide pulled up
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/candyFlossEvent: a wisp spins cash into candy floss
  candyFlossEvent: {
    chance: 0.01,
    riseMs: 400, // the wisp rising
    spinMs: 1_000, // the floss spinning
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, a crit tier + cash: src/floors/figureSkaterEvent: a skater wisp
  // carves cash across the screen
  figureSkaterEvent: {
    chance: 0.01,
    enterMs: 300, // gliding in
    skateMs: 900, // the routine
    jumpMs: 350, // the final jump
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, cash: src/floors/tripwireEvent: a thief wisp hops between laser
  // tripwires, grabbing stashes
  tripwireEvent: {
    chance: 0.01,
    hopMs: 220, // each hop
    dwellMs: 120, // each grab
    alarmMs: 300, // the alarm going off
    escapeMs: 400, // the getaway into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, levels: src/floors/sunriseEvent: a sun wisp rises and its rays
  // blaze across the bars
  sunriseEvent: {
    chance: 0.01,
    riseMs: 700, // the sun rising
    blazeMs: 900, // the rays blazing
    levelShare: 0.06, // of the bar's levels, per bar
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, cash: src/floors/rallyEvent: a beam traces a rally chart, then
  // rockets into the total
  rallyEvent: {
    chance: 0.01,
    traceMs: 1_100, // the chart being traced
    rocketMs: 400, // the rocket into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, levels + a crit tier: src/floors/ignitionEvent: sparks crack
  // across the bars like ignition
  ignitionEvent: {
    chance: 0.01,
    firesMs: [300, 140] as [number, number], // between fires, quickening
    finalGapMs: 300, // before the final ignition
    levelShare: 0.05, // of the bar's levels, per fire
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, worker tiers: src/floors/tridentEvent: three-pronged bolts
  // fork onto the workers
  tridentEvent: {
    chance: 0.01,
    volleysMs: [360, 200] as [number, number], // between volleys, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, levels: src/floors/crawlEvent: lightning crawls along the
  // bars
  crawlEvent: {
    chance: 0.01,
    lapsMs: [380, 200] as [number, number], // each crawl, quickening
    levelShare: 0.05, // of the bar's levels, per crawl
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/carpetBombingEvent: a bomber drops a stick
  // of bombs across the screen
  carpetBombingEvent: {
    chance: 0.01,
    flyMs: 1_100, // the bomber crossing
    fallMs: 380, // each bomb's fall
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, levels: src/floors/timeBombEvent: a ticking bomb pumps the
  // bars with every tick
  timeBombEvent: {
    chance: 0.01,
    flyMs: 350, // the bomb flying in
    ticksMs: [300, 260, 210, 170, 130, 100, 80, 120], // between ticks; the last is the blast
    levelShare: 0.03, // of the bar's levels, per tick
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, levels + cash: src/floors/bunkerBusterEvent: a bomb punches
  // down through the bars
  bunkerBusterEvent: {
    chance: 0.01,
    fallMs: 700, // the plunge
    buriedMs: 350, // fizzing in the ground before it blows
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, hires: src/floors/grenadeTossEvent: bouncing grenades blow
  // new workers onto empty spots
  grenadeTossEvent: {
    chance: 0.01,
    gapsMs: [300, 160] as [number, number], // between throws, quickening
    throwMs: 650, // each throw and its bounces
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/depthChargesEvent: charges blow geysers out
  // of a pool of cash
  depthChargesEvent: {
    chance: 0.01,
    dropsMs: [300, 180] as [number, number], // between drops, quickening
    fallMs: 380, // each charge's fall
    sinkMs: 220, // sinking before it blows
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, levels: src/floors/firingSquadEvent: a line of gunmen fires
  // volleys into the bars
  firingSquadEvent: {
    chance: 0.01,
    formMs: 350, // the line forming
    gapsMs: [380, 220] as [number, number], // between volleys, quickening
    levelShare: 0.05, // of the bar's levels, per volley
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, crit tiers: src/floors/akimboEvent: two guns on the screen's
  // sides fire bursts across the bars
  akimboEvent: {
    chance: 0.01,
    splitMs: 300, // the guns splitting apart
    movesMs: [220, 120] as [number, number], // each slide to the next bar, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, cash: src/floors/flakBarrageEvent: guns along the bottom fill
  // the sky with flak bursts of cash
  flakBarrageEvent: {
    chance: 0.01,
    plantMs: 300, // the guns planting
    fireMs: 1_100, // the barrage
    firesMs: [90, 35] as [number, number], // between shots, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, an unlock: src/floors/sniperNestEvent: a sniper's crack shots
  // blow open the locked floor
  sniperNestEvent: {
    chance: 0.01,
    climbMs: 300, // darting up to the nest
    huntMs: 500, // the aim laser hunting
    shotsMs: [380, 300], // between shots
    holdMs: 300,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/rewindEvent: the cash runs backwards into
  // the button, then plays back out
  rewindEvent: {
    chance: 0.01,
    rewindMs: 800, // the cash rewinding
    pauseMs: 250, // the button swelling
    playMs: 380, // each coin's flight back out
    spreadMs: 250, // the coins leaving
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, crit tiers: src/floors/morseCodeEvent: the button blinks
  // morse at the bars
  morseCodeEvent: {
    chance: 0.01,
    riseMs: 250, // the signal rising
    dotsMs: [75, 50] as [number, number], // each dot, quickening letter by letter
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, worker tiers: src/floors/stadiumWaveEvent: a stadium wave
  // rolls over the workers
  stadiumWaveEvent: {
    chance: 0.01,
    riseMs: 300, // the stacks popping up
    passMs: 1_000, // the wave rolling across
    finalGapMs: 350, // before the whole crowd leaps
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, hires: src/floors/knightsTourEvent: a knight wisp hops in Ls
  // onto empty spots
  knightsTourEvent: {
    chance: 0.01,
    legsMs: [220, 130] as [number, number], // each leg of a move, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // money, cash: src/floors/lavaLampEvent: blobs of cash rise like lava-lamp wax
  lavaLampEvent: {
    chance: 0.01,
    pourMs: 400, // the blobs pouring in
    gapsMs: [180, 70] as [number, number], // between blobs rising, quickening
    riseMs: 450, // each blob's climb
    joinMs: 300, // the blobs oozing together
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/dominoesEvent: a domino run of coins
  // topples along the bars
  dominoesEvent: {
    chance: 0.01,
    layMs: 450, // the line dealt out
    runMs: 1_100, // the topple racing down it
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/inkblotEvent: mirrored blots of cash, folded shut
  inkblotEvent: {
    chance: 0.01,
    gapsMs: [220, 90] as [number, number], // between blots, quickening
    bloomMs: 300, // each blot blooming
    foldMs: 220, // the halves folding shut
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/softServeEvent: cash piped into a soft-serve swirl
  softServeEvent: {
    chance: 0.01,
    pipeMs: 1_300, // the swirl piped, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/dollarSignEvent: cash writes a giant dollar sign
  dollarSignEvent: {
    chance: 0.01,
    writeMs: 700, // the sign written
    throbsMs: [180, 220, 200], // before each throb
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/mobiusEvent: a turning Möbius strip of cash
  mobiusEvent: {
    chance: 0.01,
    formMs: 500, // the band forming
    spinMs: 1_100, // turning, ever faster
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/swissRollEvent: a sheet of cash rolls up
  // the screen over the bars
  swissRollEvent: {
    chance: 0.01,
    layMs: 450, // the sheet spread
    rollMs: 1_000, // the roll climbing, ever faster
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, cash: src/floors/dodgeballEvent: two teams of wisps hurl balls
  dodgeballEvent: {
    chance: 0.01,
    lineUpMs: 300, // the teams lining up
    gapsMs: [260, 110] as [number, number], // between volleys, quickening
    flyMs: 260, // each ball's flight
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, hires: src/floors/congaLineEvent: a conga line drops dancers onto
  // empty spots
  congaLineEvent: {
    chance: 0.01,
    danceMs: 2_000, // the line dancing its route
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, levels: src/floors/spinningTopEvent: a spinning top grinds over the
  // bars
  spinningTopEvent: {
    chance: 0.01,
    launchMs: 300, // the top flung in
    spinMs: 1_700, // spinning and wandering
    levelShare: 0.06, // of the bar's levels, per grind
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/gobblerEvent: a chomper gobbles rows of pellets
  gobblerEvent: {
    chance: 0.01,
    runMs: 2_000, // the gobble along every row, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, crit tiers: src/floors/majoretteEvent: a twirling baton lands on
  // the bars
  majoretteEvent: {
    chance: 0.01,
    throwsMs: [650, 420] as [number, number], // each throw, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, worker tiers: src/floors/hulaHoopEvent: a hoop of wisps whirls
  // round the workers
  hulaHoopEvent: {
    chance: 0.01,
    dropMs: 260, // the hoop dropping in
    spinsMs: [380, 200] as [number, number], // each whirl, quickening
    hopMs: 180, // sailing to the next worker
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, cash: src/floors/calligraphyEvent: a brush wisp paints strokes of cash
  calligraphyEvent: {
    chance: 0.01,
    strokesMs: [420, 300] as [number, number], // each stroke, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, worker tiers + cash: src/floors/snakeCharmerEvent: a cobra of cash
  // strikes the workers
  snakeCharmerEvent: {
    chance: 0.01,
    riseMs: 350, // the cobra rising
    strikesMs: [380, 220] as [number, number], // each strike, quickening
    diveMs: 300, // the dive into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, levels + cash: src/floors/plateSpinnerEvent: plates of cash spin
  // over the bars
  plateSpinnerEvent: {
    chance: 0.01,
    hopsMs: [260, 160] as [number, number], // between plates, quickening
    spinMs: 350, // every plate spinning
    throwsMs: 120, // between plates flying off
    flightMs: 400, // each plate's flight into the total
    levelShare: 0.05, // of the bar's levels, per plate
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, hires + cash: src/floors/ferrisWheelEvent: a Ferris wheel of cash
  // drops its cars onto empty spots
  ferrisWheelEvent: {
    chance: 0.01,
    buildMs: 500, // the wheel built
    gapsMs: [260, 140] as [number, number], // between cars letting go, quickening
    spinOffMs: 250, // the wheel spinning off
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/bucketBrigadeEvent: wisps pass loads of cash up to
  // the total
  bucketBrigadeEvent: {
    chance: 0.01,
    lineUpMs: 300, // the line forming
    gapsMs: [220, 90] as [number, number], // between loads, quickening
    hopMs: 80, // each hand to hand
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, an unlock + cash: src/floors/skyLanternsEvent: lanterns carry
  // strings of cash up to the locked floor
  skyLanternsEvent: {
    chance: 0.01,
    gapsMs: [140, 70] as [number, number], // between lanterns, quickening
    floatMs: 900, // each lantern's float up
    liftMs: 300, // the flock lifting
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, crit tiers: src/floors/engraverEvent: a laser engraver rasters the
  // bars
  engraverEvent: {
    chance: 0.01,
    moveMs: 220, // the head moving to a bar
    rastersMs: [600, 380] as [number, number], // each bar's raster, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, hires: src/floors/xRayEvent: an X-ray sheet of light reveals new
  // workers
  xRayEvent: {
    chance: 0.01,
    setMs: 300, // the emitters taking their places
    scanMs: 1_400, // the sweep down, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, worker tiers: src/floors/laserLassoEvent: a loop of light lassoes
  // the workers
  laserLassoEvent: {
    chance: 0.01,
    riseMs: 250, // the roper rising
    throwsMs: [600, 360] as [number, number], // each throw, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, cash: src/floors/hexRingEvent: a hexagon of beams snaps tighter
  hexRingEvent: {
    chance: 0.01,
    formMs: 400, // the corners flying out
    gapsMs: [300, 140] as [number, number], // between snaps, quickening
    crushMs: 250, // the crush to a point
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, levels: src/floors/portcullisEvent: a gate of light slams down
  portcullisEvent: {
    chance: 0.01,
    postsMs: [150, 70] as [number, number], // between posts, quickening
    crossesMs: [220, 120] as [number, number], // between crossbars, quickening
    levelShare: 0.05, // of the bar's levels, per crossbar
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, an unlock: src/floors/keyholeEvent: a beam burns a keyhole into the
  // locked floor
  keyholeEvent: {
    chance: 0.01,
    riseMs: 250, // the emitter rising
    traceMs: 800, // the outline burned
    flyMs: 250, // the key flying in
    clicksMs: [220, 200, 260], // before each click; the last opens it
    holdMs: 300,
    mergeMs: 0,
  },
  // lightning, worker tiers: src/floors/defibrillatorEvent: paddles shock
  // the workers
  defibrillatorEvent: {
    chance: 0.01,
    moveMs: 160, // the paddles moving to a worker
    chargesMs: [260, 90] as [number, number], // each charge, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, levels: src/floors/circuitBoardEvent: sparks race along
  // circuit traces to the bars
  circuitBoardEvent: {
    chance: 0.01,
    tracesMs: [450, 260] as [number, number], // each trace, quickening
    levelShare: 0.05, // of the bar's levels, per trace
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, crit tiers: src/floors/mjolnirEvent: a charged hammer smashes
  // the bars
  mjolnirEvent: {
    chance: 0.01,
    chargesMs: [600, 380] as [number, number], // each charge-up, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/arcFlashEvent: bolts arc between scattered
  // wisps
  arcFlashEvent: {
    chance: 0.01,
    scatterMs: 300, // the wisps scattering
    arcsMs: 1_300, // the arcs, ever thicker
    finalGapMs: 200, // before every wisp arcs to the middle
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, an unlock: src/floors/fourCornersEvent: an X of lightning is
  // dragged up onto the locked floor
  fourCornersEvent: {
    chance: 0.01,
    spreadMs: 300, // the wisps flying to the corners
    cracksMs: [220, 140] as [number, number], // between bolts, quickening
    climbMs: 700, // the X climbing to the floor
    holdMs: 300,
    mergeMs: 0,
  },
  // lightning, hires: src/floors/boltWheelEvent: a wheel of lightning spokes
  // strikes empty spots
  boltWheelEvent: {
    chance: 0.01,
    flyMs: 300, // the hub flying in
    spinMs: 1_700, // the wheel turning, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, levels: src/floors/minefieldEvent: a runner trips mines along
  // the bars
  minefieldEvent: {
    chance: 0.01,
    layMs: 500, // the mines laid
    runMs: 1_300, // the run, ever faster
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, crit tiers: src/floors/cannonadeEvent: a cannon shells the bars
  cannonadeEvent: {
    chance: 0.01,
    rollMs: 300, // the cannon rolling out
    gapsMs: [450, 300] as [number, number], // between shots, quickening
    flightMs: 650, // each shell's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, worker tiers: src/floors/stickyBombsEvent: bombs stuck on the
  // workers go off in a chain
  stickyBombsEvent: {
    chance: 0.01,
    flickMs: 90, // between bombs flicked out
    flyMs: 260, // each bomb's flight
    fuseMs: 450, // every fuse fizzing
    chainMs: 500, // the chain of blasts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, hires: src/floors/crossblastEvent: bombs blow crosses of blasts
  // onto empty spots
  crossblastEvent: {
    chance: 0.01,
    dropsMs: [380, 220] as [number, number], // between bombs, quickening
    fallMs: 280, // each bomb's fall
    fuseMs: 300, // each fuse
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/mortarEvent: a walking mortar barrage
  mortarEvent: {
    chance: 0.01,
    gapsMs: [200, 90] as [number, number], // between shells, quickening
    upMs: 220, // each shell's climb out
    hangMs: 250, // out of sight
    downMs: 260, // each shell's fall
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, an unlock: src/floors/flashbangEvent: flashbangs white out the
  // screen and blow the locked floor open
  flashbangEvent: {
    chance: 0.01,
    gapsMs: [520, 420] as [number, number], // between throws, quickening
    flyMs: 380, // each throw
    holdMs: 300,
    mergeMs: 0,
  },
  // gunfire, levels: src/floors/sentryTurretEvent: a turret swings and fires
  // bursts into the bars
  sentryTurretEvent: {
    chance: 0.01,
    dropMs: 300, // the turret dropping in
    swingsMs: [180, 90] as [number, number], // each swing, quickening
    levelShare: 0.05, // of the bar's levels, per burst
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, worker tiers: src/floors/shotgunEvent: a pump shotgun blasts the
  // workers
  shotgunEvent: {
    chance: 0.01,
    moveMs: 220, // moving up beside a worker
    pumpMs: [260, 140] as [number, number], // each pump, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, cash: src/floors/bossFightEvent: a fighter shoots down a boss
  bossFightEvent: {
    chance: 0.01,
    enterMs: 400, // the boss and fighter arriving
    fightMs: 1_600, // the fight, ever faster
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, hires: src/floors/gunshipEvent: a circling gunship shoots new
  // workers onto empty spots
  gunshipEvent: {
    chance: 0.01,
    enterMs: 350, // roaring out to its orbit
    orbitMs: 1_700, // circling, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, crit tiers: src/floors/bulletTimeEvent: a volley freezes in the
  // air, then slams into the bars
  bulletTimeEvent: {
    chance: 0.01,
    riseMs: 250, // the guns rising
    freezeAfterMs: 480, // the volley flying before time stops
    freezeMs: 800, // time all but stopped
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, an unlock: src/floors/flechettesEvent: shells burst into hails
  // of darts on the locked floor
  flechettesEvent: {
    chance: 0.01,
    gapsMs: [500, 380] as [number, number], // between shells, quickening
    climbMs: 280, // each shell's climb
    holdMs: 300,
    mergeMs: 0,
  },
  // experiment, worker tiers: src/floors/radarEvent: a radar sweep pings the
  // workers
  radarEvent: {
    chance: 0.01,
    dimMs: 250, // the screen dimming to a scope
    sweepMs: 1_800, // the sweep, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/bingoEvent: a bingo card daubed to a full row
  bingoEvent: {
    chance: 0.01,
    spreadMs: 400, // the card spreading
    callsMs: [160, 60] as [number, number], // between calls, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, hires + cash: src/floors/laneHopperEvent: a frog wisp hops
  // across lanes of cash traffic
  laneHopperEvent: {
    chance: 0.01,
    hopsMs: [150, 90] as [number, number], // each hop, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, crit tiers: src/floors/simonSaysEvent: four pads flash out a
  // memory game
  simonSaysEvent: {
    chance: 0.01,
    lightMs: 300, // the pads lighting
    beatsMs: [230, 140] as [number, number], // each flash, quickening round by round
    roundGapMs: 250, // between rounds
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, levels: src/floors/equalizerEvent: equalizer columns leap to
  // the bars
  equalizerEvent: {
    chance: 0.01,
    riseMs: 300, // the columns rising
    beatsMs: [320, 150] as [number, number], // between beats, quickening
    levelShare: 0.03, // of the bar's levels, per beat
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/loadingBarEvent: a loading bar fills with cash
  loadingBarEvent: {
    chance: 0.01,
    frameMs: 350, // the frame drawing itself
    stallsMs: [200, 60] as [number, number], // each stall, shortening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, levels: src/floors/diceRollEvent: dice of wisp pips roll, then
  // every pip lands on a bar
  diceRollEvent: {
    chance: 0.01,
    rollMs: 900, // the tumble
    restMs: 200, // showing the roll
    pipsMs: 700, // the pips flying off, quickening
    flyMs: 300, // each pip's flight
    levelShare: 0.02, // of the bar's levels, per pip
    holdMs: 500,
    mergeMs: 0,
  },
  // money, cash: src/floors/mandalaEvent: cash blooms into a sand mandala
  mandalaEvent: {
    chance: 0.01,
    gapsMs: [180, 80] as [number, number], // between rings, quickening
    bloomMs: 300, // each ring blooming out
    sweepMs: 350, // the mandala swept inward
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/zenGardenEvent: cash raked round the bars
  // like a zen garden
  zenGardenEvent: {
    chance: 0.01,
    rakeMs: 1_300, // the rake down the screen, ever faster
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/accordionEvent: a pleated band of cash squeezes
  // like an accordion
  accordionEvent: {
    chance: 0.01,
    formMs: 450, // the band folding out
    gapsMs: [320, 270, 230, 190, 160], // before each squeeze
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, hires + cash: src/floors/fizzEvent: cash fizzes up like soda
  fizzEvent: {
    chance: 0.01,
    fizzMs: 1_400, // the fizz rising
    bubblesMs: 900, // between the first and last bubble popping
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/soundwaveEvent: a wave of cash swells
  // up and down the screen
  soundwaveEvent: {
    chance: 0.01,
    formMs: 400, // the line pouring out
    swellMs: 1_300, // the wave swelling
    flightMs: 400, // each coin's flight into the total
    levelShare: 0.05, // of the bar's levels, per bar
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/taffyEvent: a rope of cash pulled like taffy
  taffyEvent: {
    chance: 0.01,
    lumpMs: 350, // the lump bulging out
    pullsMs: [500, 420, 360, 300], // each pull and fold
    flingMs: 450, // the fling into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/dripPaintingEvent: cash flicked over the screen
  // like a drip painting
  dripPaintingEvent: {
    chance: 0.01,
    gapsMs: [260, 110] as [number, number], // between flicks, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, hires: src/floors/mothsEvent: moths spiral a flame, then fly to
  // empty spots
  mothsEvent: {
    chance: 0.01,
    flareMs: 300, // the flame flaring up
    circleMs: 700, // the moths spiralling in
    gapsMs: [260, 120] as [number, number], // between moths darting off, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, crit tiers: src/floors/curlingEvent: curling stones glide onto
  // the bars
  curlingEvent: {
    chance: 0.01,
    slidesMs: [800, 550] as [number, number], // each slide, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, worker tiers: src/floors/clotheslineEvent: laundry wisps drift down
  // onto the workers
  clotheslineEvent: {
    chance: 0.01,
    stringMs: 350, // the line strung
    gapsMs: [280, 120] as [number, number], // between unpinnings, quickening
    fallMs: 450, // each drift down
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/balloonPopEvent: a dart pops rising balloons
  balloonPopEvent: {
    chance: 0.01,
    floatMs: 700, // before the first pop
    gapsMs: [260, 120] as [number, number], // between pops, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, levels: src/floors/spinBottleEvent: a spinning pointer picks bars
  spinBottleEvent: {
    chance: 0.01,
    gatherMs: 300, // the pointer forming
    spinsMs: [520, 320] as [number, number], // each spin, quickening
    levelShare: 0.06, // of the bar's levels, per spin
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/skyWriterEvent: a wisp skywrites loops of glitter
  skyWriterEvent: {
    chance: 0.01,
    climbMs: 300, // climbing to the start
    writeMs: 1_300, // the loops, ever faster
    flourishMs: 450, // the underline
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, hires + cash: src/floors/goldPanEvent: a pan of cash swirled for
  // nugget wisps
  goldPanEvent: {
    chance: 0.01,
    pourMs: 450, // the pan filling
    gapsMs: [280, 140] as [number, number], // between nuggets, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, levels + cash: src/floors/bulldozerEvent: a dozer shoves heaps of
  // cash off the bars
  bulldozerEvent: {
    chance: 0.01,
    pushesMs: [520, 320] as [number, number], // each push, quickening
    flightMs: 400, // each heap's flight into the total
    levelShare: 0.05, // of the bar's levels, per push
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, worker tiers + cash: src/floors/koiPondEvent: koi leap out of a
  // pond of cash onto the workers
  koiPondEvent: {
    chance: 0.01,
    floodMs: 450, // the pond flooding
    gapsMs: [280, 130] as [number, number], // between leaps, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, crit tiers + cash: src/floors/pipeOrganEvent: chords blast cash out
  // of organ pipes
  pipeOrganEvent: {
    chance: 0.01,
    riseMs: 500, // the pipes rising
    chordsMs: [420, 300] as [number, number], // between chords, quickening
    flightMs: 400, // each coin's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/antTrailEvent: ants carry crumbs of cash to the total
  antTrailEvent: {
    chance: 0.01,
    marchMs: 1_300, // ants setting off, ever thicker
    travelMs: 700, // each ant's march
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, an unlock + cash: src/floors/hotAirBalloonEvent: a balloon of cash
  // floats up to the locked floor
  hotAirBalloonEvent: {
    chance: 0.01,
    blastsMs: [260, 220, 190, 160], // before each burner blast
    liftMs: 650, // the flight up to the floor
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, crit tiers: src/floors/lensFlareEvent: a lens flare's ghosts sweep
  // over the bars
  lensFlareEvent: {
    chance: 0.01,
    riseMs: 250, // the flare blazing up
    slideMs: 1_500, // the sun sliding down, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, levels: src/floors/tightropeEvent: a wisp walks a rope of light
  // over each bar
  tightropeEvent: {
    chance: 0.01,
    crossingsMs: [600, 380] as [number, number], // each crossing, quickening
    levelShare: 0.05, // of the bar's levels, per crossing
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, cash: src/floors/neonSignEvent: a neon sign buzzes on letter by letter
  neonSignEvent: {
    chance: 0.01,
    gapsMs: [300, 170] as [number, number], // between letters, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, worker tiers: src/floors/lightCageEvent: cages of light slam shut
  // on the workers
  lightCageEvent: {
    chance: 0.01,
    closesMs: [380, 220] as [number, number], // each cage closing, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, an unlock: src/floors/stairwayEvent: a stairway of light builds up
  // to the locked floor
  stairwayEvent: {
    chance: 0.01,
    hopsMs: [220, 120] as [number, number], // each step, quickening
    holdMs: 300,
    mergeMs: 0,
  },
  // beam, hires: src/floors/beaconsEvent: beacons call new workers down from
  // the sky
  beaconsEvent: {
    chance: 0.01,
    gapsMs: [220, 110] as [number, number], // between beacons, quickening
    waitMs: 200, // before each wisp falls
    fallMs: 280, // each fall
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, levels: src/floors/anvilCrawlerEvent: lightning crawls the sky
  // dropping forks on the bars
  anvilCrawlerEvent: {
    chance: 0.01,
    passesMs: [600, 380] as [number, number], // each pass, quickening
    levelShare: 0.05, // of the bar's levels, per fork
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/neuronsEvent: sparks race through a web of
  // neurons to the total
  neuronsEvent: {
    chance: 0.01,
    growMs: 350, // the web lighting up
    layersMs: [320, 160] as [number, number], // between layers firing, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, crit tiers: src/floors/bottledBoltEvent: trapped lightning
  // bursts out onto the bars
  bottledBoltEvent: {
    chance: 0.01,
    trapMs: 1_100, // bolts rattling in the bottle
    releasesMs: [380, 240] as [number, number], // between releases, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/thunderbirdEvent: a bird of lightning
  // thunderclaps across the screen
  thunderbirdEvent: {
    chance: 0.01,
    flightMs: 1_700, // swooping about
    diveMs: 300, // the final dive
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, an unlock: src/floors/sparkGapEvent: sparks jump a gap across
  // the locked floor
  sparkGapEvent: {
    chance: 0.01,
    flyMs: 300, // the electrodes flying out
    sparksMs: 900, // the sparks, ever faster
    arcMs: 500, // the steady arc building
    holdMs: 300,
    mergeMs: 0,
  },
  // lightning, worker tiers: src/floors/staticShockEvent: a charged wisp
  // zaps the workers
  staticShockEvent: {
    chance: 0.01,
    scuffMs: 700, // charging up
    dartsMs: [300, 160] as [number, number], // each dart to a worker, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, levels: src/floors/rocketJumpEvent: a wisp blasts itself up
  // the bars
  rocketJumpEvent: {
    chance: 0.01,
    fusesMs: [350, 150] as [number, number], // each fuse, shortening
    flyMs: 300, // each launch
    levelShare: 0.05, // of the bar's levels, per landing
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, worker tiers: src/floors/torpedoesEvent: torpedoes streak in
  // at the workers
  torpedoesEvent: {
    chance: 0.01,
    gapsMs: [260, 120] as [number, number], // between launches, quickening
    runMs: 450, // each run
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, hires: src/floors/airstrikeEvent: flares mark spots for a
  // jet's bombs
  airstrikeEvent: {
    chance: 0.01,
    markMs: 450, // the flares tossed
    flyMs: 1_000, // the jet's pass
    fallMs: 260, // each bomb's fall
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/dambusterEvent: a bomb skips across the bottom
  dambusterEvent: {
    chance: 0.01,
    lobMs: 400, // the lob down
    skipsMs: 1_400, // every skip
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, crit tiers: src/floors/airburstEvent: shells burst over the bars
  airburstEvent: {
    chance: 0.01,
    gapsMs: [480, 320] as [number, number], // between shells, quickening
    climbMs: 380, // each shell's climb
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/bombPinwheelEvent: bombs whirl off a pinwheel
  bombPinwheelEvent: {
    chance: 0.01,
    spinUpMs: 800, // the wheel spinning up
    gapsMs: [220, 100] as [number, number], // between bombs flung, quickening
    flingMs: 320, // each bomb's flight
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, levels: src/floors/bulletCurtainEvent: curtains of bullets rise
  // into the bars
  bulletCurtainEvent: {
    chance: 0.01,
    riseMs: 300, // the guns rising
    gapsMs: [360, 200] as [number, number], // between volleys, quickening
    levelShare: 0.05, // of the bar's levels, per volley
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, crit tiers: src/floors/trickShotEvent: ricochet shots into the bars
  trickShotEvent: {
    chance: 0.01,
    setMs: 300, // the gun and bumpers appearing
    speeds: [1.8, 3.2] as [number, number], // each round's px per ms, quickening
    gapMs: 120, // between shots
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, worker tiers: src/floors/railShooterEvent: a gunner on a rail
  // shoots up at the workers
  railShooterEvent: {
    chance: 0.01,
    dropMs: 300, // dropping onto the rail
    runMs: 1_400, // the run, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, cash: src/floors/skeetShootEvent: clays shot out of the sky
  skeetShootEvent: {
    chance: 0.01,
    gapsMs: [280, 140] as [number, number], // between clays, quickening
    arcMs: 900, // each clay's arc
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, hires: src/floors/tripleTapEvent: three gunners fire on each
  // empty spot
  tripleTapEvent: {
    chance: 0.01,
    aimsMs: [300, 140] as [number, number], // each aim, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, cash: src/floors/tommyGunEvent: a tommy gun sprays the screen
  tommyGunEvent: {
    chance: 0.01,
    riseMs: 300, // the gun rising
    sprayMs: 1_500, // the spray, ever faster
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, cash: src/floors/sweeperEvent: a minesweeper board floods open
  sweeperEvent: {
    chance: 0.01,
    spreadMs: 400, // the board dealt
    floodMs: 1_300, // the reveal flooding out
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, hires + cash: src/floors/clawMachineEvent: a claw grabs prizes
  // out of a pile of cash
  clawMachineEvent: {
    chance: 0.01,
    pileMs: 450, // the pile heaping up
    grabsMs: [700, 450] as [number, number], // each grab, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, levels: src/floors/lotteryEvent: a lottery draw lands balls on
  // the bars
  lotteryEvent: {
    chance: 0.01,
    spinMs: 700, // the drum spinning up
    drawsMs: [340, 180] as [number, number], // between draws, quickening
    levelShare: 0.04, // of the bar's levels, per ball
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/wordGuessEvent: a word game spells MONEY
  wordGuessEvent: {
    chance: 0.01,
    showMs: 300, // the board appearing
    flipsMs: [110, 60] as [number, number], // between tile flips, quickening row by row
    rowGapMs: 150, // between rows
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, worker tiers: src/floors/memoryMatchEvent: matched card pairs
  // fire wisps at the workers
  memoryMatchEvent: {
    chance: 0.01,
    dealMs: 400, // the cards dealt
    turnsMs: [400, 220] as [number, number], // between turns, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, crit tiers: src/floors/ticTacToeEvent: crosses of light win a
  // game of noughts and crosses
  ticTacToeEvent: {
    chance: 0.01,
    gridMs: 400, // the grid slashed in
    movesMs: [380, 240] as [number, number], // between moves, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/revCounterEvent: a giant rev counter hits the
  // redline
  revCounterEvent: {
    chance: 0.01,
    dialMs: 400, // the dial sweeping in
    revsMs: [500, 280] as [number, number], // each rev up, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/sluiceEvent: sluice gates open one by one down a
  // cascade of cash
  sluiceEvent: {
    chance: 0.01,
    streamMs: 1_000, // the cascade pouring
    travelMs: 700, // each coin's trip down the sluice
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/foundryEvent: molten cash poured from a crucible
  // into moulds
  foundryEvent: {
    chance: 0.01,
    streamMs: 1_100, // the pour
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/jetStreamEvent: a jet of cash peels off
  // eddies into the bars
  jetStreamEvent: {
    chance: 0.01,
    streamMs: 1_000, // the jet blasting
    travelMs: 800, // each coin's trip along the jet
    eddyMs: 450, // each eddy's swirl into its bar
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/moatEvent: a river of cash circles the screen like
  // a moat
  moatEvent: {
    chance: 0.01,
    streamMs: 1_000, // the river filling the moat
    travelMs: 900, // each coin's lap
    holdMs: 250,
    mergeMs: 500,
  },
  // money, worker tiers + cash: src/floors/seepEvent: cash seeps down the walls
  // and pools under the workers
  seepEvent: {
    chance: 0.01,
    gapsMs: [280, 140] as [number, number], // between seeps, quickening
    streamMs: 500, // each seep trickling
    travelMs: 700, // each coin's trip down the wall
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/meanderEvent: a meandering river of cash
  // loops through the bars
  meanderEvent: {
    chance: 0.01,
    streamMs: 1_000, // the river pouring
    travelMs: 900, // each coin's trip down the river
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, cash: src/floors/waltzEvent: wisps waltz in pairs, throwing coins on
  // every beat
  waltzEvent: {
    chance: 0.01,
    enterMs: 300, // the pairs whirling in
    danceMs: 1_300, // the dance, ever faster
    gatherMs: 350, // the pairs gathering for the finale
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, crit tiers: src/floors/gyroscopeEvent: gyroscope rings of wisps spin
  // up and fling into the bars
  gyroscopeEvent: {
    chance: 0.01,
    spinMs: 500, // the rings spinning up
    gapsMs: [340, 180] as [number, number], // between flings, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, worker tiers: src/floors/dragonflyEvent: a dragonfly wisp darts and
  // hovers from worker to worker
  dragonflyEvent: {
    chance: 0.01,
    dartMs: 160, // each dart
    hoversMs: [280, 140] as [number, number], // each hover, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, hires: src/floors/ringTossEvent: wisp rings tossed onto empty spots
  ringTossEvent: {
    chance: 0.01,
    gapsMs: [300, 160] as [number, number], // between tosses, quickening
    flightMs: 420, // each ring's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, levels: src/floors/slipstreamEvent: wisps race in each other's
  // slipstream past the bars
  slipstreamEvent: {
    chance: 0.01,
    raceMs: 450, // the pack lining up
    gapsMs: [280, 140] as [number, number], // between overtakes, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/sheetMusicEvent: wisp notes play a tune on a staff
  sheetMusicEvent: {
    chance: 0.01,
    staffMs: 300, // the staff drawn in
    tuneMs: 1_300, // the tune, ever faster
    chordMs: 300, // the closing chord
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/leafBlowerEvent: a wisp blows drifts of cash about
  leafBlowerEvent: {
    chance: 0.01,
    flyMs: 300, // the wisp flying out
    gapsMs: [300, 150] as [number, number], // between gusts, quickening
    streamMs: 400, // each gust
    travelMs: 700, // each coin's trip on the gust
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, levels + cash: src/floors/loomEvent: a shuttle wisp weaves cash
  // through a warp of rivers
  loomEvent: {
    chance: 0.01,
    warpMs: 400, // the warp strung
    warpTravelMs: 600, // each warp coin's trip
    passesMs: [320, 170] as [number, number], // each shuttle pass, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/highDiveEvent: a wisp dives from a tower into a pool
  // of cash
  highDiveEvent: {
    chance: 0.01,
    climbMs: 450, // the climb up the tower
    teeterMs: 300, // the teeter on the board
    diveMs: 350, // the dive
    poolMs: 300, // the pool pouring
    spoutMs: 600, // the splash spouting
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, hires + cash: src/floors/sowerEvent: a wisp sows cash and workers
  // sprout
  sowerEvent: {
    chance: 0.01,
    glideMs: 1_400, // the sower's glide
    holdMs: 500,
    mergeMs: 500,
  },
  // mix, unlock + cash: src/floors/courierEvent: a courier wisp carries a river
  // of cash to the locked floor
  courierEvent: {
    chance: 0.01,
    streamMs: 1_000, // the river trailing
    travelMs: 700, // each coin's trip
    holdMs: 500,
    mergeMs: 500,
  },
  // mix, cash: src/floors/rodeoEvent: a wisp rides a bucking river of cash
  rodeoEvent: {
    chance: 0.01,
    streamMs: 1_200, // the river bucking
    travelMs: 700, // each coin's trip
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, crit tiers: src/floors/crosshairEvent: a crosshair sweeps, hunts and
  // locks onto the bars
  crosshairEvent: {
    chance: 0.01,
    sweepMs: 400, // the crosshair sweeping in
    huntsMs: [440, 230] as [number, number], // each hunt, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, cash: src/floors/irisEvent: beams fan out and close like a camera
  // iris
  irisEvent: {
    chance: 0.01,
    fanMs: 300, // the beams fanning out
    stepsMs: [280, 140] as [number, number], // each iris step, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, levels: src/floors/bankShotEvent: a beam banks off the screen's edges
  // into the bars
  bankShotEvent: {
    chance: 0.01,
    legsMs: [220, 110] as [number, number], // each leg, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, worker tiers: src/floors/sunbeamsEvent: sunbeams break through onto
  // the workers
  sunbeamsEvent: {
    chance: 0.01,
    aimMs: 400, // the sun rising
    gapsMs: [300, 160] as [number, number], // between beams, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, unlock: src/floors/stargateEvent: a ring of beams dials open the
  // locked floor
  stargateEvent: {
    chance: 0.01,
    riseMs: 400, // the ring rising
    locksMs: [280, 140] as [number, number], // each chevron lock, quickening
    fireMs: 400, // the gate firing
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, worker tiers: src/floors/catsCradleEvent: beams strung between
  // wisps like a cat's cradle
  catsCradleEvent: {
    chance: 0.01,
    stringsMs: [280, 140] as [number, number], // between strings, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, worker tiers: src/floors/thunderheadEvent: a thunderhead of
  // wisps strikes the workers
  thunderheadEvent: {
    chance: 0.01,
    gatherMs: 450, // the cloud gathering
    strikesMs: [280, 130] as [number, number], // between strikes, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, levels: src/floors/pitchforkEvent: three-pronged bolts fork into
  // the bars
  pitchforkEvent: {
    chance: 0.01,
    leadMs: 350, // the wisp leading in
    roundsMs: [400, 220] as [number, number], // each round, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/jumperCablesEvent: two wisps jump-start the
  // screen in surges of sparks
  jumperCablesEvent: {
    chance: 0.01,
    surgesMs: [340, 170] as [number, number], // between surges, quickening
    slamMs: 300, // the final jolt
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, crit tiers: src/floors/lashEvent: a whip of lightning cracks
  // on the bars
  lashEvent: {
    chance: 0.01,
    windMs: 400, // the wind-up
    cracksMs: [340, 170] as [number, number], // between cracks, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, hires: src/floors/sparkPlugEvent: spark plug wisps fire sparks
  // onto empty spots
  sparkPlugEvent: {
    chance: 0.01,
    flyMs: 350, // the plugs flying out
    firesMs: [280, 140] as [number, number], // between sparks, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, unlock: src/floors/liveWireEvent: a live wire thrashes and lashes
  // open the locked floor
  liveWireEvent: {
    chance: 0.01,
    thrashMs: 1_100, // the wire thrashing
    lashMs: 350, // the last lash into the floor
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, levels: src/floors/fuseRaceEvent: lit fuses race to bombs on the
  // bars
  fuseRaceEvent: {
    chance: 0.01,
    racesMs: [700, 400] as [number, number], // each fuse's race, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/bouncingBettyEvent: buried mines bounce up and
  // burst into cash
  bouncingBettyEvent: {
    chance: 0.01,
    buryMs: 400, // the mines buried
    minesMs: [260, 120] as [number, number], // between mines, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, worker tiers: src/floors/pressureCookerEvent: a pressure cooker
  // builds steam and blows onto the workers
  pressureCookerEvent: {
    chance: 0.01,
    riseMs: 350, // the cooker rising
    steamsMs: [280, 140] as [number, number], // between steam jets, quickening
    boilMs: 300, // the boil before it blows
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, hires: src/floors/hotPotatoEvent: a lit bomb hops spot to spot,
  // blowing where workers form
  hotPotatoEvent: {
    chance: 0.01,
    hopsMs: [420, 220] as [number, number], // each hop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, unlock: src/floors/daisyChainEvent: bombs round the screen's edge
  // go off in a chain into the locked floor
  daisyChainEvent: {
    chance: 0.01,
    scatterMs: 500, // the bombs scattering round the edge
    chainMs: [1_300, 700] as [number, number], // the chain round the edge, quickening
    leapMs: 300, // the last leap into the floor
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, crit tiers: src/floors/shapedChargeEvent: rings of charges blow
  // inward onto the bars
  shapedChargeEvent: {
    chance: 0.01,
    fusesMs: [500, 300] as [number, number], // each ring's fuse, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/detcordEvent: a cord of light erupts in a
  // rolling wall of blasts
  detcordEvent: {
    chance: 0.01,
    layMs: 700, // the cord laid
    burnMs: 1_000, // the spark burning back, speeding up
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, cash: src/floors/bulletBloomEvent: rings of bullets stop and bloom
  // into rings
  bulletBloomEvent: {
    chance: 0.01,
    riseMs: 350, // the boss rising
    wavesMs: [480, 400, 320], // between waves, one per wave
    hangMs: 150, // the buds hanging before they bloom
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, crit tiers: src/floors/highNoonEvent: two gunners duel, then turn
  // on the bars
  highNoonEvent: {
    chance: 0.01,
    skidMs: 350, // the gunners skidding out
    duelsMs: [240, 110] as [number, number], // between shots, quickening
    turnMs: 200, // the turn onto the bars
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, levels: src/floors/hailfireEvent: a line of guns rains volleys on
  // the bars
  hailfireEvent: {
    chance: 0.01,
    spreadMs: 400, // the guns spreading out
    volleysMs: [380, 200] as [number, number], // between volleys, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, worker tiers: src/floors/dervishEvent: a spinning gunner snaps
  // shots at the workers
  dervishEvent: {
    chance: 0.01,
    whirlMs: 350, // the gunner whirling out
    spinMs: 1_400, // the spin, ever faster
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, cash: src/floors/invadersEvent: a gun shoots down a grid of
  // invaders
  invadersEvent: {
    chance: 0.01,
    formMs: 700, // the grid forming up
    killsMs: [100, 45] as [number, number], // between kills, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, hires: src/floors/gunKataEvent: a gunner fires both ways at once
  // onto empty spots
  gunKataEvent: {
    chance: 0.01,
    dartMs: 180, // each dart to a pose
    posesMs: [420, 260] as [number, number], // between poses, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, unlock: src/floors/lockbusterEvent: a ring of guns hammers the
  // locked floor
  lockbusterEvent: {
    chance: 0.01,
    ringMs: 500, // the guns fanning into a ring
    shotsMs: [90, 35] as [number, number], // between shots, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, crit tiers: src/floors/connectFourEvent: four-in-a-rows of
  // wisp tokens tier up the bars
  connectFourEvent: {
    chance: 0.01,
    dropsMs: [130, 55] as [number, number], // between drops, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, levels: src/floors/comboEvent: a combo of jabs on the clicked
  // bar
  comboEvent: {
    chance: 0.01,
    jabMs: 120, // each jab's dart in
    hitsMs: [200, 80] as [number, number], // between hits, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/skeeBallEvent: wisp balls roll into scoring
  // holes
  skeeBallEvent: {
    chance: 0.01,
    rollMs: 450, // each ball's roll and hop
    ballsMs: [240, 110] as [number, number], // between balls, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, cash: src/floors/bubbleShooterEvent: banked shots pop patches
  // of bubble wisps
  bubbleShooterEvent: {
    chance: 0.01,
    fillMs: 500, // the cluster filling in
    shotsMs: [420, 260] as [number, number], // between shots, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // money, worker tiers + cash: src/floors/deltaEvent: a river of cash fans out
  // into a delta onto the workers
  deltaEvent: {
    chance: 0.01,
    streamMs: 900, // the river pouring
    travelMs: 700, // each coin's trip down the trunk
    channelMs: 450, // each channel's run to its worker
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/hydrantEvent: jets of cash burst out every way
  hydrantEvent: {
    chance: 0.01,
    streamMs: 700, // each jet pouring
    travelMs: 600, // each coin's trip to the edge
    secondMs: 450, // the second ring of jets bursting
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/cloverleafEvent: a river of cash loops a giant
  // four-leaf clover
  cloverleafEvent: {
    chance: 0.01,
    streamMs: 900, // the river pouring
    travelMs: 1_500, // each coin's trip round the clover
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/pinstripeEvent: rivers of cash shoot across
  // along the bars
  pinstripeEvent: {
    chance: 0.01,
    gapsMs: [260, 140] as [number, number], // between stripes, quickening
    streamMs: 500, // each stripe pouring
    travelMs: 600, // each coin's trip across
    holdMs: 250,
    mergeMs: 500,
  },
  // money, crit tier + cash: src/floors/faucetEvent: a tap drips cash onto the
  // clicked bar, then gushes
  faucetEvent: {
    chance: 0.01,
    dripsMs: [300, 120] as [number, number], // between drips, quickening
    fallMs: 350, // each drop's fall
    gushMs: 500, // the gush pouring
    holdMs: 250,
    mergeMs: 500,
  },
  // money, hires + cash: src/floors/showerheadEvent: a showerhead sprays rivers
  // of cash onto empty spots
  showerheadEvent: {
    chance: 0.01,
    riseMs: 300, // the showerhead rising
    streamMs: 700, // each river pouring
    travelMs: 550, // each coin's trip down
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, crit tiers: src/floors/binaryStarEvent: two wisps spiral in, merge
  // and jet into the bars
  binaryStarEvent: {
    chance: 0.01,
    spiralMs: 1_300, // the spiral in, quickening
    jetMs: 250, // each jet's flight to its bar
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, levels: src/floors/hopscotchEvent: a wisp plays hopscotch up the bars
  hopscotchEvent: {
    chance: 0.01,
    hopsMs: [380, 200] as [number, number], // each hop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, hires: src/floors/tadpolesEvent: a mother wisp lays tadpoles that
  // wriggle onto empty spots
  tadpolesEvent: {
    chance: 0.01,
    swimMs: 300, // the mother swimming out
    gapsMs: [260, 130] as [number, number], // between tadpoles, quickening
    wriggleMs: 550, // each tadpole's wriggle
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, worker tiers: src/floors/blinkEvent: a wisp blinks from worker to
  // worker
  blinkEvent: {
    chance: 0.01,
    staysMs: [340, 170] as [number, number], // each stay, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/bumperCarsEvent: wisps career round like bumper cars
  bumperCarsEvent: {
    chance: 0.01,
    driveMs: 1_700, // the bumping, speeding up
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, cash: src/floors/pigeonsEvent: a flock perches, then bursts into
  // flight
  pigeonsEvent: {
    chance: 0.01,
    flutterMs: 700, // the flock fluttering down
    perchMs: 350, // the flock perched
    flyMs: 450, // each bird's flight to the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/squidEvent: a squid wisp jets up the screen squirting
  // cash
  squidEvent: {
    chance: 0.01,
    spurtsMs: [320, 170] as [number, number], // each spurt, quickening
    squirtMs: 200, // each squirt pouring
    travelMs: 450, // each coin's trip back
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, worker tiers + cash: src/floors/waterPistolEvent: a wisp drinks a
  // river of cash and squirts the workers
  waterPistolEvent: {
    chance: 0.01,
    diveMs: 250, // the dive to the bottom
    drinkMs: 450, // the drink
    gapsMs: [220, 120] as [number, number], // between squirts, quickening
    squirtMs: 350, // each squirt's trip to its worker
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/poiEvent: two poi wisps swing rivers of cash into
  // flowers
  poiEvent: {
    chance: 0.01,
    streamMs: 1_100, // the rivers pouring
    travelMs: 1_600, // the poi's loop
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, crit tiers + cash: src/floors/bartenderEvent: two wisps flair-toss a
  // slug of cash, then pour it on the bars
  bartenderEvent: {
    chance: 0.01,
    tossesMs: [380, 200] as [number, number], // each toss, quickening
    pourMs: 350, // each pour onto its bar
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, unlock + cash: src/floors/poleVaultEvent: a wisp sprints a river of
  // cash and vaults into the locked floor
  poleVaultEvent: {
    chance: 0.01,
    streamMs: 900, // the river pouring
    travelMs: 1_400, // the run and the vault
    holdMs: 500,
    mergeMs: 500,
  },
  // mix, levels + cash: src/floors/paintRollerEvent: a roller wisp paints the
  // bars with cash
  paintRollerEvent: {
    chance: 0.01,
    streamMs: 1_000, // the stripe pouring
    travelMs: 1_600, // the roller's trip over every bar
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, crit tiers: src/floors/buzzsawEvent: a buzzsaw of beams grinds into
  // the bars
  buzzsawEvent: {
    chance: 0.01,
    rollMs: 250, // each roll to a bar
    grindsMs: [450, 250] as [number, number], // each grind, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, levels: src/floors/lightCyclesEvent: two light cycles race walls of
  // light through the bars
  lightCyclesEvent: {
    chance: 0.01,
    raceMs: 1_600, // the race
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, hires: src/floors/fiberOpticEvent: curving fibers of light carry
  // pulses onto empty spots
  fiberOpticEvent: {
    chance: 0.01,
    gapsMs: [260, 130] as [number, number], // between fibers, quickening
    fiberMs: 400, // each pulse's run
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, cash: src/floors/daddyLonglegsEvent: a wisp strides up the screen on
  // legs of light
  daddyLonglegsEvent: {
    chance: 0.01,
    walkMs: 1_800, // the walk
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, worker tiers: src/floors/knighthoodEvent: a blade of light dubs the
  // workers
  knighthoodEvent: {
    chance: 0.01,
    knightsMs: [500, 260] as [number, number], // each dubbing, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, unlock: src/floors/cuttingTorchEvent: a torch beam cuts round the
  // locked floor's lock
  cuttingTorchEvent: {
    chance: 0.01,
    flyMs: 300, // the torch flying up
    cutMs: 1_300, // the cut round, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, worker tiers: src/floors/stElmosFireEvent: crackling coronas
  // build round the workers until bolts strike
  stElmosFireEvent: {
    chance: 0.01,
    coronaMs: 500, // each corona building
    gapsMs: [300, 150] as [number, number], // between workers, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, unlock: src/floors/steppedLeaderEvent: a stepped leader creeps up
  // to the locked floor
  steppedLeaderEvent: {
    chance: 0.01,
    stepsMs: [180, 70] as [number, number], // each step, quickening
    strokeMs: 400, // the return stroke
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, levels: src/floors/trolleyEvent: a trolley on a live wire drops
  // bolts on the bars
  trolleyEvent: {
    chance: 0.01,
    runsMs: [550, 320] as [number, number], // each run, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/boltBounceEvent: a bolt ricochets round the
  // screen
  boltBounceEvent: {
    chance: 0.01,
    legsMs: [220, 90] as [number, number], // each leg, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, crit tiers: src/floors/stormCrownEvent: a crown of wisps hurls
  // bolts into the bars
  stormCrownEvent: {
    chance: 0.01,
    volleysMs: [500, 300] as [number, number], // each bar's volley, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, hires: src/floors/vanDeGraaffEvent: a charged dome throws bolts
  // onto empty spots
  vanDeGraaffEvent: {
    chance: 0.01,
    chargeMs: 600, // the dome charging
    gapsMs: [220, 110] as [number, number], // between bolts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, levels: src/floors/barrelRollEvent: bomb barrels roll down the
  // rows onto the bars
  barrelRollEvent: {
    chance: 0.01,
    gapsMs: [300, 180] as [number, number], // between barrels, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/bombStackEvent: a pyramid of bombs blows from
  // the bottom up
  bombStackEvent: {
    chance: 0.01,
    stackMs: 600, // the stack piling up
    blowsMs: [350, 250] as [number, number], // between rows, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, crit tiers: src/floors/romanCandleEvent: a roman candle pops
  // bombs onto the bars
  romanCandleEvent: {
    chance: 0.01,
    popsMs: [260, 140] as [number, number], // between pops, quickening
    flightMs: 450, // each bomb's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, worker tiers: src/floors/whistlersEvent: whistling rockets
  // corkscrew onto the workers
  whistlersEvent: {
    chance: 0.01,
    gapsMs: [240, 120] as [number, number], // between launches, quickening
    flightMs: 600, // each rocket's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, unlock: src/floors/trebuchetEvent: a trebuchet flings bombs into
  // the locked floor
  trebuchetEvent: {
    chance: 0.01,
    throwsMs: [700, 500] as [number, number], // each throw, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, hires: src/floors/dropPodsEvent: bomb pods slam down onto empty
  // spots
  dropPodsEvent: {
    chance: 0.01,
    gapsMs: [260, 130] as [number, number], // between pods, quickening
    fallMs: 450, // each pod's fall
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/bombCarouselEvent: a whirling ring of bombs
  // flings out across the screen
  bombCarouselEvent: {
    chance: 0.01,
    spinMs: 900, // the ring spinning up
    flingMs: 300, // each bomb's fling
    releasesMs: 600, // the ring letting go round
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, cash: src/floors/lastStandEvent: a gunner guns down waves of wisps
  lastStandEvent: {
    chance: 0.01,
    wavesMs: [550, 450] as [number, number], // between waves, quickening
    approachMs: 700, // each raider's charge
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, crit tiers: src/floors/tinCanEvent: a can kept hopping by gunfire
  // is knocked onto the bars
  tinCanEvent: {
    chance: 0.01,
    hopsMs: [320, 200] as [number, number], // each hop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, worker tiers: src/floors/pointDefenseEvent: a turret shoots down
  // wisps over the workers
  pointDefenseEvent: {
    chance: 0.01,
    gapsMs: [260, 140] as [number, number], // between kills, quickening
    fallMs: 550, // each wisp's fall
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, cash: src/floors/targetPracticeEvent: pop-up targets drilled into
  // coins
  targetPracticeEvent: {
    chance: 0.01,
    targetsMs: [220, 110] as [number, number], // between targets, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, hires: src/floors/flareGunEvent: flares hang over empty spots and
  // drop
  flareGunEvent: {
    chance: 0.01,
    gapsMs: [220, 120] as [number, number], // between flares, quickening
    hangMs: 250, // each flare hanging
    dropMs: 250, // each flare's drop
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, levels: src/floors/rappelEvent: a gunner rappels down, raking the
  // bars
  rappelEvent: {
    chance: 0.01,
    boundsMs: [450, 300] as [number, number], // each bound, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, crit tiers: src/floors/stackerEvent: rows of wisps stack up like
  // the arcade game
  stackerEvent: {
    chance: 0.01,
    rowsMs: [420, 200] as [number, number], // each row's slide, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/coinPusherEvent: a pusher shoves cash off a
  // ledge
  coinPusherEvent: {
    chance: 0.01,
    pushesMs: [380, 220] as [number, number], // each push, quickening
    streamMs: 1_300, // the feed pouring
    travelMs: 500, // each coin's trip to the ledge
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, levels: src/floors/highStrikerEvent: a mallet fires a puck up to
  // ring the bell
  highStrikerEvent: {
    chance: 0.01,
    strikesMs: [550, 700] as [number, number], // each strike, flying higher
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, worker tiers: src/floors/noteHighwayEvent: notes stream down
  // lanes in a rhythm game
  noteHighwayEvent: {
    chance: 0.01,
    notesMs: [180, 90] as [number, number], // between notes, quickening
    fallMs: 500, // each note's fall
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, unlock: src/floors/safecrackerEvent: a dial spun to its
  // combination opens the locked floor
  safecrackerEvent: {
    chance: 0.01,
    spinsMs: [650, 450] as [number, number], // each spin, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, hires: src/floors/gumballMachineEvent: a gumball machine drops
  // gumballs onto empty spots
  gumballMachineEvent: {
    chance: 0.01,
    fillMs: 500, // the globe filling
    cranksMs: [300, 160] as [number, number], // between cranks, quickening
    rollMs: 450, // each gumball's bounce down
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/ninjaEvent: tossed wisps sliced into coins
  ninjaEvent: {
    chance: 0.01,
    tossesMs: [200, 90] as [number, number], // between tosses, quickening
    flightMs: 800, // each toss's flight
    holdMs: 250,
    mergeMs: 500,
  },
  // money, crit tiers + cash: src/floors/bungeeEvent: a rope of cash plunges
  // onto the bars and recoils
  bungeeEvent: {
    chance: 0.01,
    plungesMs: [380, 260] as [number, number], // each plunge, quickening
    recoilMs: 220, // each recoil
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/funnelCakeEvent: cash drizzled in loopy curls
  funnelCakeEvent: {
    chance: 0.01,
    streamMs: 1_000, // the drizzle pouring
    travelMs: 1_700, // each coin's trip along the curls
    holdMs: 250,
    mergeMs: 500,
  },
  // money, hires + cash: src/floors/chrysanthemumEvent: a shell of cash bursts
  // into streamers onto empty spots
  chrysanthemumEvent: {
    chance: 0.01,
    riseMs: 350, // the shell rising
    streamMs: 500, // each streamer pouring
    droopMs: 600, // each streamer's droop
    holdMs: 500,
    mergeMs: 500,
  },
  // money, cash: src/floors/crossroadsEvent: four rivers collide in the middle
  crossroadsEvent: {
    chance: 0.01,
    streamMs: 700, // the rivers pouring
    travelMs: 650, // each river's rush in
    eruptMs: 600, // the geyser into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/waterslideEvent: a river loops the loop at
  // every bar
  waterslideEvent: {
    chance: 0.01,
    streamMs: 1_000, // the river pouring
    travelMs: 1_700, // each coin's ride down the slide
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/bannerEvent: rivers of cash unfurl like banners
  bannerEvent: {
    chance: 0.01,
    gapsMs: [380, 250] as [number, number], // between banners, quickening
    streamMs: 500, // each banner pouring
    travelMs: 600, // each coin's trip across
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, worker tiers: src/floors/hauntEvent: a ghost wisp swoops through the
  // workers
  hauntEvent: {
    chance: 0.01,
    hauntMs: 1_700, // the haunting, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/mapleSeedsEvent: seed wisps twirl down and pop
  mapleSeedsEvent: {
    chance: 0.01,
    flingMs: 250, // the seeds flung up
    fallMs: 1_100, // the slowest seed's twirl down
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, levels: src/floors/donutsEvent: a wisp spins donuts round the bars
  donutsEvent: {
    chance: 0.01,
    spinsMs: [420, 250] as [number, number], // each set of donuts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/hamsterWheelEvent: a wheel of wisps spins up and
  // bursts into the total
  hamsterWheelEvent: {
    chance: 0.01,
    spinMs: 1_200, // the wheel spinning up
    flyMs: 300, // each rim wisp's flight to the total
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, unlock: src/floors/lunarLanderEvent: a lander touches down on the
  // locked floor
  lunarLanderEvent: {
    chance: 0.01,
    launchMs: 500, // the launch up and over
    descentMs: 1_000, // the descent onto the lock
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, hires: src/floors/dowsingEvent: a dowsing wisp hunts out empty spots
  dowsingEvent: {
    chance: 0.01,
    findsMs: [450, 260] as [number, number], // each find, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, crit tiers: src/floors/matadorEvent: a bull wisp charges past a
  // matador into the bars
  matadorEvent: {
    chance: 0.01,
    chargesMs: [380, 240] as [number, number], // each charge, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, cash: src/floors/flashFloodEvent: a flood of cash chases a fleeing wisp
  flashFloodEvent: {
    chance: 0.01,
    streamMs: 1_100, // the flood pouring
    travelMs: 1_500, // the chase
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, levels + cash: src/floors/dolphinEvent: a dolphin leaps from a river
  // of cash up to the bars
  dolphinEvent: {
    chance: 0.01,
    leapsMs: [400, 260] as [number, number], // each leap, quickening
    streamMs: 1_500, // the river pouring
    travelMs: 1_400, // each coin's trip along the bottom
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/pufferEvent: a puffer gulps rivers of cash and spikes
  pufferEvent: {
    chance: 0.01,
    gulpMs: 800, // the gulping, swelling
    spikeMs: 450, // the spikes' trip out
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, hires + cash: src/floors/hockeyStopEvent: a skater hockey-stops at
  // empty spots spraying cash
  hockeyStopEvent: {
    chance: 0.01,
    glidesMs: [360, 220] as [number, number], // each glide, quickening
    holdMs: 500,
    mergeMs: 500,
  },
  // mix, crit tiers + cash: src/floors/twirlEvent: a wisp twirls a skirt of
  // cash, then stamps on the bar
  twirlEvent: {
    chance: 0.01,
    twirlsMs: [600, 450] as [number, number], // each twirl, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, worker tiers + cash: src/floors/whaleEvent: a whale blows spouts of
  // cash up onto the workers
  whaleEvent: {
    chance: 0.01,
    cruiseMs: 1_500, // the whale's cruise
    spoutMs: 350, // each spout's rise
    streamMs: 1_300, // the sea pouring
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, cash: src/floors/lightPaintingEvent: a wisp paints the air with light
  lightPaintingEvent: {
    chance: 0.01,
    paintMs: 1_600, // the painting
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, crit tiers: src/floors/saberThrowEvent: a thrown spinning blade of
  // light slices the bars
  saberThrowEvent: {
    chance: 0.01,
    throwMs: 1_300, // the throw, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, unlock: src/floors/laserMazeEvent: a wisp threads a maze of beams up
  // to the locked floor
  laserMazeEvent: {
    chance: 0.01,
    runMs: 1_500, // the run, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, levels: src/floors/tapeMeasureEvent: a tape of light measures the
  // bars
  tapeMeasureEvent: {
    chance: 0.01,
    pullsMs: [300, 160] as [number, number], // each pull, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, cash: src/floors/pulsarEvent: a pulsar spins twin beams
  pulsarEvent: {
    chance: 0.01,
    spinMs: 1_500, // the spin, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, levels: src/floors/shortCircuitEvent: bolts arc between the bars
  shortCircuitEvent: {
    chance: 0.01,
    arcsMs: [160, 60] as [number, number], // between arcs, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, crit tiers: src/floors/conductorEvent: a conductor's downbeats
  // strike the bars
  conductorEvent: {
    chance: 0.01,
    barsMs: [600, 400] as [number, number], // each measure, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, worker tiers: src/floors/doubleStrikeEvent: lightning strikes
  // each worker twice
  doubleStrikeEvent: {
    chance: 0.01,
    gapsMs: [300, 150] as [number, number], // between workers, quickening
    waitMs: 260, // from the leader to the strike
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, unlock: src/floors/lightningFenceEvent: current races up a fence
  // of posts to the locked floor
  lightningFenceEvent: {
    chance: 0.01,
    plantMs: 450, // the posts planting
    jumpsMs: [160, 70] as [number, number], // between jumps, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, hires: src/floors/heatLightningEvent: sheet lightning drops
  // bolts onto empty spots
  heatLightningEvent: {
    chance: 0.01,
    flickerMs: 600, // the sheet lightning building
    gapsMs: [240, 120] as [number, number], // between drops, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, levels: src/floors/powderKegsEvent: rows of kegs chain along
  // the bars, clusters jumping row to row
  powderKegsEvent: {
    chance: 0.01,
    chainsMs: [140, 80] as [number, number], // between kegs on a row, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/bombFountainEvent: a fountain of bombs rains
  // down in chains and clusters
  bombFountainEvent: {
    chance: 0.01,
    gapsMs: [140, 70] as [number, number], // between bombs, quickening
    flightMs: 550, // each bomb's arc
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, worker tiers: src/floors/fragOutEvent: grenades blow on the
  // workers and fragment
  fragOutEvent: {
    chance: 0.01,
    gapsMs: [320, 180] as [number, number], // between grenades, quickening
    flightMs: 400, // each grenade's lob
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, crit tiers: src/floors/faultLineEvent: chains of charges race to
  // each bar and erupt in a cluster
  faultLineEvent: {
    chance: 0.01,
    chainsMs: [80, 45] as [number, number], // between charges, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, hires: src/floors/willowShellsEvent: shells burst into willow
  // bomblets onto empty spots
  willowShellsEvent: {
    chance: 0.01,
    gapsMs: [300, 200] as [number, number], // between shells, quickening
    riseMs: 350, // each shell's rise
    droopMs: 450, // each bomblet's droop
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, unlock: src/floors/swarmStrikeEvent: a swarm of bombs circles
  // and dives into the locked floor
  swarmStrikeEvent: {
    chance: 0.01,
    circleMs: 700, // the swarm circling
    divesMs: [160, 80] as [number, number], // between dives, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/concentricEvent: rings of bombs blow outward
  // ring by ring
  concentricEvent: {
    chance: 0.01,
    ringsMs: [450, 300] as [number, number], // each ring's chain, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, crit tiers: src/floors/grazeEvent: a dodger threads a bullet storm
  // onto the bars
  grazeEvent: {
    chance: 0.01,
    runMs: 1_600, // the run through the storm
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, worker tiers: src/floors/hotfootEvent: bullets stitch up to the
  // workers' feet
  hotfootEvent: {
    chance: 0.01,
    stitchesMs: [320, 180] as [number, number], // between stitches, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, cash: src/floors/dogfightEvent: two fighters dogfight, misses
  // popping into coins
  dogfightEvent: {
    chance: 0.01,
    fightMs: 1_900, // the dogfight
    burstsMs: [260, 140] as [number, number], // between bursts, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, cash: src/floors/bulletRoseEvent: rings of bullets open into a rose
  bulletRoseEvent: {
    chance: 0.01,
    ringsMs: [300, 220] as [number, number], // between rings, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, levels: src/floors/armorPiercerEvent: heavy rounds punch down
  // through every bar
  armorPiercerEvent: {
    chance: 0.01,
    shotsMs: [320, 180] as [number, number], // between shots, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, hires: src/floors/spotterEvent: a spotter marks empty spots for a
  // sniper
  spotterEvent: {
    chance: 0.01,
    callsMs: [300, 170] as [number, number], // between calls, quickening
    aimMs: 200, // the aim line before each shot
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/pegSolitaireEvent: pegs jump each other and
  // pop into coins
  pegSolitaireEvent: {
    chance: 0.01,
    setMs: 400, // the board setting up
    jumpsMs: [260, 140] as [number, number], // between jumps, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, hires: src/floors/marbleDropEvent: rods pulled from a nest drop
  // marbles onto empty spots
  marbleDropEvent: {
    chance: 0.01,
    fillMs: 450, // the nest filling
    pullsMs: [320, 200] as [number, number], // between pulls, quickening
    dropMs: 450, // each marble's bounce down
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, worker tiers: src/floors/statuesEvent: runners race to the
  // workers on GO! and freeze on STOP!
  statuesEvent: {
    chance: 0.01,
    dashesMs: [350, 250] as [number, number], // each dash, quickening
    freezeMs: 280, // each freeze
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/flappyWispEvent: a wisp flaps through gaps in
  // pillars of light
  flappyWispEvent: {
    chance: 0.01,
    pillarsMs: [320, 180] as [number, number], // between pillars, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, cash: src/floors/buriedTreasureEvent: a digger follows a trail
  // to treasure that gushes cash
  buriedTreasureEvent: {
    chance: 0.01,
    walkMs: 900, // the walk along the trail
    digsMs: [300, 200] as [number, number], // between digs, quickening
    gushMs: 500, // the treasure gushing
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, cash: src/floors/airHockeyEvent: mallets smack a puck to a goal
  airHockeyEvent: {
    chance: 0.01,
    shotsMs: [320, 160] as [number, number], // each shot, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // money, tiers + cash: src/floors/boltOfCashEvent: zigzag bolts of cash
  // crack down onto the bars
  boltOfCashEvent: {
    chance: 0.01,
    boltsMs: [420, 260] as [number, number], // between bolts, quickening
    strikeMs: 300, // each bolt's coins racing down it
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/pendulumPourEvent: a swinging jet of cash
  // sweeps across the bars
  pendulumPourEvent: {
    chance: 0.01,
    swingsMs: [520, 360] as [number, number], // each swing, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/popTheCorkEvent: the button is shaken and the cork
  // pops, gushing cash
  popTheCorkEvent: {
    chance: 0.01,
    shakeMs: 450, // the shaking before the pop
    gushesMs: [240, 140] as [number, number], // between gushes, quickening
    travelMs: 420, // each gush's coins in flight
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, levels: src/floors/wallJumpEvent: a wisp wall-jumps up the screen
  // kicking off the bars
  wallJumpEvent: {
    chance: 0.01,
    jumpsMs: [380, 240] as [number, number], // each jump, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/superballEvent: a superball bounces ever faster
  superballEvent: {
    chance: 0.01,
    bounceMs: 1700, // the bouncing
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, tiers: src/floors/spinDashEvent: a wisp revs up and dashes into bars
  spinDashEvent: {
    chance: 0.01,
    revsMs: [480, 260] as [number, number], // each rev, shortening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, worker tiers: src/floors/cupidEvent: a cupid shoots arrows at workers
  cupidEvent: {
    chance: 0.01,
    shotsMs: [300, 160] as [number, number], // between arrows, quickening
    flightMs: 380, // each arrow's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, hires: src/floors/storkEvent: a stork drops bundles onto empty spots
  storkEvent: {
    chance: 0.01,
    flyMs: 1300, // the stork's flight across the screen
    dropMs: 380, // each bundle's fall
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, unlock: src/floors/paperPlaneEvent: a paper plane stunts into the lock
  paperPlaneEvent: {
    chance: 0.01,
    flightMs: 1900, // the whole flight
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, tiers: src/floors/spikeEvent: a volleyball set and spiked onto bars
  spikeEvent: {
    chance: 0.01,
    setsMs: [480, 320] as [number, number], // each set, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/toasterEvent: toast wisps pop up and burst into coins
  toasterEvent: {
    chance: 0.01,
    roundsMs: [420, 260] as [number, number], // between rounds, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, levels: src/floors/xylophoneEvent: a mallet plays the bars
  xylophoneEvent: {
    chance: 0.01,
    downMs: 230, // each hop down the bars
    upMs: 130, // each hop back up
    levelShare: 0.05, // of a bar's levels, per strike
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, worker tiers: src/floors/birthdayCandlesEvent: candle flames blown out
  // by a gust
  birthdayCandlesEvent: {
    chance: 0.01,
    lightMs: 110, // between candles lighting
    flameMs: 250, // the flames flickering before the gust
    gustMs: 520, // the gust crossing the screen
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, levels: src/floors/dropTowerEvent: a rider drops and brakes on each bar
  dropTowerEvent: {
    chance: 0.01,
    launchMs: 280, // shot up to the top
    hangMs: 200, // hanging at the top
    dropsMs: [380, 220] as [number, number], // each drop, quickening
    brakeMs: 140, // braking on a bar
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, tiers: src/floors/arrowVolleyEvent: archers rain volleys onto bars
  arrowVolleyEvent: {
    chance: 0.01,
    volleysMs: [480, 360] as [number, number], // between volleys, quickening
    flightMs: 420, // each arrow's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, worker tiers + cash: src/floors/makeAWishEvent: cash pours into a well
  // and wishes leap onto workers
  makeAWishEvent: {
    chance: 0.01,
    pourMs: 600, // the river pouring into the well
    travelMs: 420, // each coin's trip down it
    wishesMs: [240, 140] as [number, number], // between wishes, quickening
    flightMs: 340, // each wish's leap
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/blunderbussEvent: a recoiling gun sprays cones of cash
  blunderbussEvent: {
    chance: 0.01,
    shotsMs: [380, 240] as [number, number], // between shots, quickening
    kickMs: 200, // each recoil
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, hires + cash: src/floors/genieEvent: cash smoke forms a genie who flings
  // rivers onto empty spots
  genieEvent: {
    chance: 0.01,
    riseMs: 600, // the smoke spiralling up
    flingsMs: [260, 160] as [number, number], // between flings, quickening
    flightMs: 360, // each river's flight
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, cash: src/floors/solarFlareEvent: a sun throws arching flares
  solarFlareEvent: {
    chance: 0.01,
    riseMs: 280, // the sun rising into place
    flaresMs: [260, 140] as [number, number], // between flares, quickening
    arcMs: 260, // each arch reaching out
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, worker tiers: src/floors/heatVisionEvent: twin eye beams scorch workers
  heatVisionEvent: {
    chance: 0.01,
    aimMs: 120, // the aim lasers flickering
    fireMs: 160, // the beams searing
    gapsMs: [80, 30] as [number, number], // between workers, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, hires: src/floors/printHeadEvent: a print head prints new workers
  printHeadEvent: {
    chance: 0.01,
    linesMs: [45, 28] as [number, number], // each printed line, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, tiers: src/floors/auroraEvent: curtains of light fold onto the bars
  auroraEvent: {
    chance: 0.01,
    curtainsMs: [460, 320] as [number, number], // between curtains, quickening
    fallMs: 480, // each curtain coming down
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/thunderRingsEvent: strikes blast out rings of
  // lightning
  thunderRingsEvent: {
    chance: 0.01,
    strikesMs: [380, 220] as [number, number], // between strikes, quickening
    ringMs: 420, // each ring swelling out
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, tiers: src/floors/arcWeldEvent: electrodes weld along the bars
  arcWeldEvent: {
    chance: 0.01,
    weldsMs: [460, 300] as [number, number], // each weld, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/stormKiteEvent: lightning strikes a kite and runs
  // down its string
  stormKiteEvent: {
    chance: 0.01,
    climbMs: 400, // the kite climbing
    strikesMs: [320, 180] as [number, number], // between strikes, quickening
    runMs: 200, // each spark down the string
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, levels: src/floors/volcanicLightningEvent: bolts leap out of an
  // ash plume onto the bars
  volcanicLightningEvent: {
    chance: 0.01,
    eruptMs: 380, // the plume billowing up
    boltsMs: [300, 180] as [number, number], // between bolts, quickening
    levelShare: 0.06, // of a bar's levels, per bolt
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, hires: src/floors/sculptorEvent: converging bolts strike new
  // workers into being
  sculptorEvent: {
    chance: 0.01,
    chargesMs: [200, 100] as [number, number], // each charge, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/grandFinaleEvent: chain, cluster shells, salvo
  grandFinaleEvent: {
    chance: 0.01,
    riseMs: 300, // each shell's climb
    chainMs: 90, // between blasts along the row
    clusterMs: 170, // between cluster shells
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, worker tiers: src/floors/bombBouquetEvent: chains up stems into
  // clusters on the workers
  bombBouquetEvent: {
    chance: 0.01,
    linksMs: 80, // between blasts up a stem
    stemsMs: [300, 180] as [number, number], // between stems, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/cascadeEvent: blasts cascade down the screen
  cascadeEvent: {
    chance: 0.01,
    chainMs: 130, // between blasts along the top row
    fallMs: 300, // each bomblet's fall
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, tiers: src/floors/pinballBombEvent: a bomb banks off the walls
  // into the bars
  pinballBombEvent: {
    chance: 0.01,
    speed: 2.2, // px per ms at first
    speedUp: 1.08, // faster after every leg
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, hires: src/floors/bombTrainEvent: a train drops bomb cars onto
  // empty spots
  bombTrainEvent: {
    chance: 0.01,
    runMs: 1500, // the engine's run
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, unlock: src/floors/breachingChargeEvent: charges blow the lock
  breachingChargeEvent: {
    chance: 0.01,
    setupMs: 300, // the charges flying into place
    chainMs: 90, // between blasts round the ring
    coreMs: 220, // from the core cluster to the main charge
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, levels: src/floors/confettiCannonEvent: cannon shells burst into
  // clusters over the bars
  confettiCannonEvent: {
    chance: 0.01,
    volleysMs: [380, 240] as [number, number], // between volleys, quickening
    flightMs: 340, // each shell's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, levels: src/floors/ammoBeltEvent: a belt-fed gun rakes the bars
  ammoBeltEvent: {
    chance: 0.01,
    shotMs: 55, // between shots in a burst
    burstsMs: [220, 120] as [number, number], // between bursts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, cash: src/floors/gauntletEvent: a runner dodges crossfire
  gauntletEvent: {
    chance: 0.01,
    runMs: 850, // each way across
    shotsMs: [110, 55] as [number, number], // between shots, thickening
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, worker tiers: src/floors/turretTowerEvent: a tower of turrets
  // fires at the workers
  turretTowerEvent: {
    chance: 0.01,
    aimMs: 110, // each turret's aim
    turretsMs: [230, 130] as [number, number], // between turrets, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, cash: src/floors/shellCasingsEvent: spent casings tinkle into coins
  shellCasingsEvent: {
    chance: 0.01,
    shotMs: 120, // between shots at first
    casingMs: 420, // each casing's fall
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, tiers: src/floors/dartsEvent: darts thrown at a board of light
  dartsEvent: {
    chance: 0.01,
    throwsMs: [480, 340] as [number, number], // between throws, quickening
    flightMs: 280, // each dart's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/battleshipEvent: shots sink two hidden ships
  battleshipEvent: {
    chance: 0.01,
    shotsMs: [170, 90] as [number, number], // between shots, quickening
    flightMs: 300, // each shot's flight
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, cash: src/floors/interceptorsEvent: interceptor blasts catch
  // falling missiles
  interceptorsEvent: {
    chance: 0.01,
    wavesMs: [560, 420] as [number, number], // between waves, quickening
    fallMs: 700, // each missile's fall
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, cash: src/floors/landGrabEvent: cut lines claim regions of coins
  landGrabEvent: {
    chance: 0.01,
    cutsMs: [280, 160] as [number, number], // each cut, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, worker tiers: src/floors/duckDuckGooseEvent: duck, duck, goose!
  duckDuckGooseEvent: {
    chance: 0.01,
    tapsMs: [260, 150] as [number, number], // between taps, quickening
    chaseMs: 420, // the goose's chase
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/ringerEvent: a shooter knocks marbles out of a
  // ring
  ringerEvent: {
    chance: 0.01,
    shotsMs: [300, 200] as [number, number], // between shots, quickening
    flickMs: 220, // each shot's flick
    knockMs: 260, // a marble flying out
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, levels: src/floors/hurdlesEvent: a runner clears a hurdle on
  // every bar
  hurdlesEvent: {
    chance: 0.01,
    runsMs: [520, 360] as [number, number], // each run along a bar, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, levels: src/floors/luckyRollEvent: dice rolls and ladders up
  // the bars
  luckyRollEvent: {
    chance: 0.01,
    rollMs: 180, // the dice call before hopping
    hopMs: 60, // each hop
    climbMs: 200, // each ladder climb
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/cashRegisterEvent: a sale rings up, KA-CHING!
  cashRegisterEvent: {
    chance: 0.01,
    pressesMs: [260, 130] as [number, number], // between key presses, quickening
    gushMs: 500, // the torrent gushing
    travelMs: 460, // each coin's trip up into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, tiers: src/floors/horseRaceEvent: horses race down the bars
  horseRaceEvent: {
    chance: 0.01,
    raceMs: 1100, // the winner's race
    spreadMs: 350, // from the winner to the last across
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, tiers: src/floors/dunkTankEvent: pitches dunk wisps into bars
  dunkTankEvent: {
    chance: 0.01,
    pitchesMs: [480, 330] as [number, number], // between pitches, quickening
    flightMs: 280, // each ball's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // money, cash: src/floors/halfPipeEvent: a river rides a half-pipe and launches
  halfPipeEvent: {
    chance: 0.01,
    passesMs: [420, 260] as [number, number], // each pass, quickening
    launchMs: 420, // the launch into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/knotEvent: a river ties itself in ever tighter knots
  knotEvent: {
    chance: 0.01,
    knotsMs: [700, 420] as [number, number], // each knot, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/tickerTapeEvent: bands of cash race across the screen
  tickerTapeEvent: {
    chance: 0.01,
    bandsMs: [300, 180] as [number, number], // between bands, quickening
    crossMs: 420, // each band crossing
    holdMs: 250,
    mergeMs: 500,
  },
  // money, hires + cash: src/floors/cashBridgeEvent: arches of cash span spot to
  // spot
  cashBridgeEvent: {
    chance: 0.01,
    spansMs: [400, 240] as [number, number], // each span, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, levels: src/floors/skippingStoneEvent: a stone skips down the bars
  skippingStoneEvent: {
    chance: 0.01,
    skipsMs: [340, 160] as [number, number], // each skip, shortening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, tiers: src/floors/woodpeckerEvent: a woodpecker drills the bars
  woodpeckerEvent: {
    chance: 0.01,
    pecksMs: [70, 45] as [number, number], // each peck, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/frisbeeEvent: a frisbee curves between catchers
  frisbeeEvent: {
    chance: 0.01,
    throwsMs: [320, 180] as [number, number], // each throw, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, unlock: src/floors/kangarooEvent: a kangaroo bounds up to the lock
  kangarooEvent: {
    chance: 0.01,
    hopsMs: [300, 380] as [number, number], // each hop, ever bigger
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, hires: src/floors/badmintonEvent: shuttlecocks smashed onto spots
  badmintonEvent: {
    chance: 0.01,
    lobsMs: [380, 240] as [number, number], // each lob, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/tumbleweedEvent: a tumbleweed bounces in the wind
  tumbleweedEvent: {
    chance: 0.01,
    hopsMs: [150, 220] as [number, number], // each hop, growing
    boundsMs: 260, // each bound back on the gust
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, worker tiers: src/floors/shuttleRunEvent: a runner tags the workers
  shuttleRunEvent: {
    chance: 0.01,
    runsMs: [300, 200] as [number, number], // each run out and back, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, hires: src/floors/echolocationEvent: a bat pings and swoops onto spots
  echolocationEvent: {
    chance: 0.01,
    pingMs: 160, // each ping sweeping out
    swoopsMs: [200, 120] as [number, number], // each swoop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, levels: src/floors/lacrosseEvent: passes caught at the bars' ends
  lacrosseEvent: {
    chance: 0.01,
    passesMs: [260, 160] as [number, number], // each pass, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // mix, levels + cash: src/floors/jetSkiEvent: a jet ski tears along the bars
  jetSkiEvent: {
    chance: 0.01,
    runsMs: [340, 220] as [number, number], // each run, quickening
    jumpMs: 160, // each jump down to the next bar
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, worker tiers + cash: src/floors/drinkingStrawEvent: workers sip cash
  // up out of a pool
  drinkingStrawEvent: {
    chance: 0.01,
    fillMs: 420, // the pool filling
    sipsMs: [200, 110] as [number, number], // between sips, quickening
    sipMs: 320, // each sip climbing its straw
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/seaSerpentEvent: a serpent of cash humps across
  seaSerpentEvent: {
    chance: 0.01,
    swimMs: 1200, // the swim across
    breachMs: 420, // the leap into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/magicTrickEvent: an endless scarf of cash out of a hat
  magicTrickEvent: {
    chance: 0.01,
    pullMs: 1500, // the whole pull
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, tiers + cash: src/floors/fountainPenEvent: a pen signs in cash and
  // stabs the bars
  fountainPenEvent: {
    chance: 0.01,
    signMs: 800, // the signature
    strokesMs: [260, 150] as [number, number], // each stroke, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/spoolEvent: a spool unspools and reels in a river
  spoolEvent: {
    chance: 0.01,
    unspoolMs: 700, // unspooling
    reelMs: 420, // reeling back in
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, levels: src/floors/laserRainEvent: lasers rain down onto the bars
  laserRainEvent: {
    chance: 0.01,
    rainMs: 1300, // the downpour
    levelShare: 0.02, // of a bar's levels, per drop
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, tiers: src/floors/crossCutEvent: two beams cross on each bar
  crossCutEvent: {
    chance: 0.01,
    sweepsMs: [420, 260] as [number, number], // each sweep, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, worker tiers: src/floors/heliographEvent: a mirror flashes sunlight
  // onto the workers
  heliographEvent: {
    chance: 0.01,
    swingsMs: [220, 120] as [number, number], // each swing, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, cash: src/floors/starburstEvent: shells burst into stars of beams
  starburstEvent: {
    chance: 0.01,
    shellsMs: [300, 180] as [number, number], // between shells, quickening
    riseMs: 260, // each shell's climb
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, levels: src/floors/thunderDrumEvent: bolts drum on the bars
  thunderDrumEvent: {
    chance: 0.01,
    beatsMs: [170, 90] as [number, number], // between beats, quickening
    levelShare: 0.03, // of a bar's levels, per beat
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/boltBarrageEvent: a barrage of bolts
  boltBarrageEvent: {
    chance: 0.01,
    barrageMs: 1400, // the barrage
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, tiers: src/floors/coilgunEvent: a slug fired through coils
  coilgunEvent: {
    chance: 0.01,
    shotMs: [320, 200] as [number, number], // each shot, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/snowflakeEvent: lightning grows into a snowflake
  snowflakeEvent: {
    chance: 0.01,
    stageMs: 300, // each stage of growth
    blazeMs: 400, // the flake blazing before it shatters
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, worker tiers: src/floors/bombSnakeEvent: a snake of bombs blows
  // tail to head
  bombSnakeEvent: {
    chance: 0.01,
    slitherMs: 700, // the slither into place
    chainMs: 140, // between blasts up its body
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, hires: src/floors/spiderMinesEvent: mines scuttle to spots and
  // blow
  spiderMinesEvent: {
    chance: 0.01,
    scuttleMs: 450, // each mine's scuttle
    chainMs: 130, // between mines blowing
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/crossetteEvent: shells split in crosses
  crossetteEvent: {
    chance: 0.01,
    shellsMs: [500, 380] as [number, number], // between shells, quickening
    riseMs: 300, // each shell's climb
    splitMs: 160, // each split flying out
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, cash: src/floors/spiralChargeEvent: a spiral of charges chains out
  spiralChargeEvent: {
    chance: 0.01,
    setupMs: 300, // the charges flying into place
    chainMs: 110, // between blasts round the spiral
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, levels: src/floors/bombBubblesEvent: bubbled bombs blow under
  // the bars
  bombBubblesEvent: {
    chance: 0.01,
    riseMs: 320, // each bubble's rise
    barsMs: [360, 240] as [number, number], // between bars, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, tiers: src/floors/rocketSledEvent: a sled boosts along the bars
  rocketSledEvent: {
    chance: 0.01,
    runsMs: [420, 280] as [number, number], // each run, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/dynamiteFishingEvent: dynamite in a pool of cash
  dynamiteFishingEvent: {
    chance: 0.01,
    fillMs: 450, // the pool filling
    sticksMs: [200, 120] as [number, number], // between sticks, quickening
    flightMs: 300, // each stick's toss
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, tiers: src/floors/chargeShotEvent: a charged shot smashes each bar
  chargeShotEvent: {
    chance: 0.01,
    chargeMs: [460, 300] as [number, number], // each charge, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, cash: src/floors/corkscrewRoundsEvent: helix streams of bullets
  corkscrewRoundsEvent: {
    chance: 0.01,
    shotMs: 45, // between pairs
    flightMs: 520, // each round's flight across
    volleysMs: [140, 80] as [number, number], // between volleys, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, worker tiers: src/floors/orbitalGunsEvent: guns orbit and fire on
  // each worker
  orbitalGunsEvent: {
    chance: 0.01,
    orbitsMs: [420, 260] as [number, number], // each orbit, quickening
    lapsHz: [1.5, 2.5] as [number, number], // laps a second, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, levels: src/floors/tracerRoundsEvent: crossfire tracers into bars
  tracerRoundsEvent: {
    chance: 0.01,
    fireMs: 1100, // the crossfire
    levelShare: 0.03, // of a bar's levels, per hit
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, hires: src/floors/pelletStormEvent: pellet blasts onto spots
  pelletStormEvent: {
    chance: 0.01,
    blastsMs: [300, 180] as [number, number], // between blasts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, unlock: src/floors/bulletSnakeEvent: a snaking stream into the lock
  bulletSnakeEvent: {
    chance: 0.01,
    fireMs: 1100, // the stream
    flightMs: 420, // each round's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, worker tiers: src/floors/rockPaperScissorsEvent: rock, paper,
  // scissors, shoot!
  rockPaperScissorsEvent: {
    chance: 0.01,
    beatMs: 260, // each call
    winsMs: [130, 80] as [number, number], // between wins, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, levels: src/floors/limboEvent: a dancer limbos under each pole
  limboEvent: {
    chance: 0.01,
    slidesMs: [380, 240] as [number, number], // each slide, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, tiers: src/floors/quizShowEvent: buzz, correct, crit tier
  quizShowEvent: {
    chance: 0.01,
    questionsMs: [380, 240] as [number, number], // before each buzz, quickening
    answerMs: 220, // from buzz to answer
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/sumoEvent: two wrestlers clash in a ring
  sumoEvent: {
    chance: 0.01,
    clashesMs: [480, 320] as [number, number], // each clash, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, levels: src/floors/paperTossEvent: bank shots into bins
  paperTossEvent: {
    chance: 0.01,
    tossesMs: [300, 180] as [number, number], // between tosses, quickening
    flightMs: 480, // each toss
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, worker tiers: src/floors/armWrestlingEvent: arm-wrestling bouts
  armWrestlingEvent: {
    chance: 0.01,
    strainMs: [320, 180] as [number, number], // each strain, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/keepyUppyEvent: counting kick-ups to ten
  keepyUppyEvent: {
    chance: 0.01,
    touchesMs: [200, 280] as [number, number], // each touch, ever higher
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, tiers: src/floors/pinTheTailEvent: a dizzy wisp pins the bars
  pinTheTailEvent: {
    chance: 0.01,
    wanderMs: [460, 300] as [number, number], // each stagger, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, hires: src/floors/trustFallEvent: fallers caught on empty spots
  trustFallEvent: {
    chance: 0.01,
    fallsMs: [220, 130] as [number, number], // between falls, quickening
    fallMs: 360, // each fall
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/bubbleGumEvent: bubbles blown until they pop
  bubbleGumEvent: {
    chance: 0.01,
    blowMs: [420, 600] as [number, number], // each bubble, ever bigger
    holdMs: 250,
    mergeMs: 500,
  },
  // money, levels + cash: src/floors/canalLocksEvent: a river climbs a flight
  // of locks beside the bars
  canalLocksEvent: {
    chance: 0.01,
    locksMs: [520, 300] as [number, number], // each lock's fill, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/bobsledEvent: a river races down a bobsled run
  bobsledEvent: {
    chance: 0.01,
    runMs: [520, 300] as [number, number], // each curve, quickening
    launchMs: 440, // the ramp's launch into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/springLoadedEvent: a spring of cash squeezes and
  // lets go
  springLoadedEvent: {
    chance: 0.01,
    formMs: 520, // the river coiling into the spring
    jerksMs: [300, 200] as [number, number], // between squeezes, quickening
    launchMs: 520, // the jet up into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, cash: src/floors/influxEvent: eight rivers pile into a heap
  influxEvent: {
    chance: 0.01,
    riverMs: 520, // each river's run into the middle
    churnMs: 380, // the heap quaking before it erupts
    eruptMs: 460, // the eruption into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, levels: src/floors/unevenBarsEvent: a gymnast swings bar to bar
  unevenBarsEvent: {
    chance: 0.01,
    swingsMs: [420, 260] as [number, number], // each bar's giant circles, quickening
    flightsMs: [320, 220] as [number, number], // each release, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, hires: src/floors/bumblebeeEvent: a bee buzzes onto empty spots
  bumblebeeEvent: {
    chance: 0.01,
    flightsMs: [420, 220] as [number, number], // each flight, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, tiers: src/floors/shotPutEvent: a shot spun up and heaved onto bars
  shotPutEvent: {
    chance: 0.01,
    spinsMs: [440, 300] as [number, number], // each wind-up, quickening
    flightsMs: [300, 380] as [number, number], // each put, ever farther
    bounceMs: 220, // the bounce back to the button
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, unlock: src/floors/humanCannonballEvent: a wisp fired through rings
  // into the lock
  humanCannonballEvent: {
    chance: 0.01,
    fuseMs: 620, // the fuse burning down
    flightMs: 420, // the flight up into the lock
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/foxAndHoundsEvent: hounds chase a darting fox
  foxAndHoundsEvent: {
    chance: 0.01,
    dartsMs: [240, 120] as [number, number], // each dart, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, cash: src/floors/kingfisherEvent: a kingfisher dives into each bar
  kingfisherEvent: {
    chance: 0.01,
    divesMs: [520, 320] as [number, number], // each perch, bob and dive, quickening
    finalMs: 420, // the last dive into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, tiers + cash: src/floors/joustEvent: knights joust on the bars
  joustEvent: {
    chance: 0.01,
    chargesMs: [520, 340] as [number, number], // each charge, quickening
    gapMs: 120, // between jousts
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, hires + cash: src/floors/pelicanEvent: a pelican scoops cash onto spots
  pelicanEvent: {
    chance: 0.01,
    fillMs: 320, // the pool filling
    tripsMs: [560, 380] as [number, number], // each scoop and dump, quickening
    gushMs: 180, // each pouch gushing out
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/dragsterEvent: a dragster revs and races the bottom
  dragsterEvent: {
    chance: 0.01,
    revMs: 480, // revving at the line
    thirdsMs: [380, 200] as [number, number], // each third of the run, quickening
    chuteMs: 260, // the parachute blooming
    whipMs: 420, // the tail whipping into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, levels + cash: src/floors/fireBreatherEvent: a wisp breathes cash on
  // the bars
  fireBreatherEvent: {
    chance: 0.01,
    gulpsMs: [300, 200] as [number, number], // each gulp, quickening
    breathMs: 340, // each breath reaching the bars
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, cash: src/floors/bucketSwingEvent: a bucket of cash swung in loops
  bucketSwingEvent: {
    chance: 0.01,
    scoopMs: 300, // the scoop out of the button
    loopsMs: [460, 240] as [number, number], // each loop, quickening
    flingMs: 460, // the bucketful flying into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // mix, worker tiers + cash: src/floors/puppeteerEvent: strings of cash yank
  // the workers
  puppeteerEvent: {
    chance: 0.01,
    riseMs: 300, // rising to the top
    stringMs: 240, // each string letting down
    yanksMs: [260, 130] as [number, number], // between yanks, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, cash: src/floors/coronaEvent: an eclipse flares corona beams
  coronaEvent: {
    chance: 0.01,
    swellMs: 280, // the sun swelling
    eclipseMs: 900, // the moon sliding over it
    ringMs: 220, // the diamond ring
    fireMs: 260, // every beam firing outward
    collapseMs: 380, // the cash collapsing into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // beam, worker tiers: src/floors/pillarsEvent: pillars of light slam onto
  // the workers
  pillarsEvent: {
    chance: 0.01,
    aimsMs: [240, 120] as [number, number], // each aim before its slam, quickening
    dropMs: 90, // each pillar thumping down
    blazeMs: 400, // every pillar widening together
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, unlock: src/floors/laserLadderEvent: rungs of beams climb to the lock
  laserLadderEvent: {
    chance: 0.01,
    rungsMs: [150, 70] as [number, number], // between rungs, quickening
    fireMs: 300, // the whole ladder firing into the lock
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, tiers: src/floors/beamSplitterEvent: a beam splits into a tree of
  // beams onto the bars
  beamSplitterEvent: {
    chance: 0.01,
    genMs: [320, 180] as [number, number], // each generation, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, hires: src/floors/teleporterEvent: workers beam in on the empty spots
  teleporterEvent: {
    chance: 0.01,
    spotMs: [520, 280] as [number, number], // each spot, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // beam, levels: src/floors/ringLightEvent: a hoop of beams drops down the
  // screen
  ringLightEvent: {
    chance: 0.01,
    formMs: 320, // the hoop forming
    dropMs: 1000, // its drop down the screen
    cinchMs: 260, // cinching to a point
    levelShare: 0.06, // of a bar's levels, as the hoop passes it
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, worker tiers: src/floors/taserEvent: a taser zaps each worker
  taserEvent: {
    chance: 0.01,
    zapMs: [460, 260] as [number, number], // each worker, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/arcFurnaceEvent: an arc boils a pool of cash
  arcFurnaceEvent: {
    chance: 0.01,
    fillMs: 380, // the pool filling
    geyserMs: [260, 150] as [number, number], // between geysers, quickening
    eruptMs: 380, // the pool's flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // lightning, hires: src/floors/fiveFingersEvent: a hand of bolts reaches
  // down onto the empty spots
  fiveFingersEvent: {
    chance: 0.01,
    reachMs: 520, // the first finger's crawl down
    fingerMs: [260, 140] as [number, number], // between fingers, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, levels: src/floors/cattleProdEvent: a prod jabs each bar
  cattleProdEvent: {
    chance: 0.01,
    hopMs: 160, // the prod's hop to each bar
    jabMs: [90, 35] as [number, number], // between jabs, quickening to a buzz
    levelShare: 0.02, // of a bar's levels, per jab
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, tiers: src/floors/boltSlingEvent: a slingshot of lightning
  // fires wisps into the bars
  boltSlingEvent: {
    chance: 0.01,
    pullMs: [440, 300] as [number, number], // each draw back, quickening
    flyMs: [150, 100] as [number, number], // each shot's flight, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // lightning, cash: src/floors/collidingStormsEvent: two storm clouds collide
  collidingStormsEvent: {
    chance: 0.01,
    approachMs: 1300, // the clouds rolling in
    riverMs: 420, // the cash river's run into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, levels: src/floors/bombJugglerEvent: a juggler tosses lit bombs
  // onto the bars
  bombJugglerEvent: {
    chance: 0.01,
    juggleMs: 800, // the juggling
    tossMs: [260, 180] as [number, number], // between tosses, quickening
    flightMs: 300, // each toss's flight
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, worker perma tiers: src/floors/bombSquadEvent: a defuser
  // wisp zips between bombs over the workers, each blowing as it arrives
  bombSquadEvent: {
    chance: 0.01,
    hopsMs: [380, 200] as [number, number], // each hop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/splitterEvent: a bouncing bomb splits into
  // three, each into three more, the last generation rippling off
  splitterEvent: {
    chance: 0.01,
    flightMs: [520, 380, 300] as [number, number, number], // per generation
    rippleMs: 45,
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, crit tiers: src/floors/bombPendulumEvent: a bomb on a
  // pendulum smashes each end of every income bar
  bombPendulumEvent: {
    chance: 0.01,
    swingsMs: [380, 230] as [number, number], // each swing, harder
    reformMs: 80,
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, free hires: src/floors/paradropEvent: bombs drift down under
  // glitter canopies onto the empty spots
  paradropEvent: {
    chance: 0.01,
    dropMs: 700,
    gapsMs: [300, 130] as [number, number], // between drops, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // explosion, cash: src/floors/bombPachinkoEvent: bombs rattle down a peg
  // field and blow along the bottom
  bombPachinkoEvent: {
    chance: 0.01,
    dropGapMs: 60,
    rowMs: 100,
    chainMs: 55,
    holdMs: 250,
    mergeMs: 500,
  },
  // explosion, cash: src/floors/fuseClockEvent: a spark races round a clock
  // of twelve bombs, blowing each hour
  fuseClockEvent: {
    chance: 0.01,
    hoursMs: [200, 70] as [number, number], // each hour, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, cash: src/floors/hedgehogEvent: a rolling wisp fires a bullet
  // ring at the top of every bounce
  hedgehogEvent: {
    chance: 0.01,
    bouncesMs: [440, 300] as [number, number], // each bounce, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, cash: src/floors/splitShotEvent: a ricochet that splits in two
  // at every bounce
  splitShotEvent: {
    chance: 0.01,
    speeds: [2.2, 4] as [number, number], // px/ms, first to last generation
    holdMs: 250,
    mergeMs: 500,
  },
  // gunfire, crit tiers: src/floors/bulletLassoEvent: a gun circles each
  // bar, a loop of bullets cinching onto it
  bulletLassoEvent: {
    chance: 0.01,
    loopsMs: [460, 320] as [number, number], // each loop, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, worker perma tiers: src/floors/bulletWeaveEvent: two guns weave
  // a lattice of bullets across each worker
  bulletWeaveEvent: {
    chance: 0.01,
    weavesMs: [440, 260] as [number, number], // each weave, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, levels: src/floors/bulletFountainEvent: a fountain of bullets
  // arcing up and raining onto the bars
  bulletFountainEvent: {
    chance: 0.01,
    fireMs: 1050, // the fountain, quickening
    flightMs: [620, 460] as [number, number], // each bullet's arc, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // gunfire, hires: src/floors/coveringFireEvent: recruits dash through crossfire
  coveringFireEvent: {
    chance: 0.01,
    gapMs: [210, 130] as [number, number], // between recruits, quickening
    dashMs: 560, // each dash, cover to cover
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/auctionEvent: climbing bids, going, going, sold
  auctionEvent: {
    chance: 0.01,
    bidsMs: [230, 140] as [number, number], // between bids, quickening
    callMs: 210, // going once, going twice, sold
    pourMs: 620, // the torrent's trip into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, tiers: src/floors/checkersEvent: multi-jumps bar to bar, king me
  checkersEvent: {
    chance: 0.01,
    hopsMs: [170, 110] as [number, number], // each hop, quickening
    cascadeMs: 110, // between tiers after "KING ME!"
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/minesweeperEvent: squares flood open, mines blow
  minesweeperEvent: {
    chance: 0.01,
    waveMs: 46, // per ring of squares opening
    chainMs: 110, // between mines
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, worker tiers: src/floors/cheerSquadEvent: K-I-T-T-Y chant
  cheerSquadEvent: {
    chance: 0.01,
    beatsMs: [260, 170] as [number, number], // between letters, quickening
    tossMs: 520, // the pyramid toss, up and down
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, unlock: src/floors/jackInTheBoxEvent: crank, POP!, spring up
  jackInTheBoxEvent: {
    chance: 0.01,
    windMs: 950, // the crank winding up, quickening
    springMs: [190, 130] as [number, number], // each floor sprung, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/fortuneTellerEvent: a crystal ball sees riches
  fortuneTellerEvent: {
    chance: 0.01,
    linesMs: [330, 260] as [number, number], // between visions, quickening
    pourMs: 640, // the geyser's trip into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // experiment, tiers: src/floors/magicEightBallEvent: shake, answer, tier up
  magicEightBallEvent: {
    chance: 0.01,
    shakesMs: [360, 230] as [number, number], // each shake, quickening
    answerMs: 170, // the answer's hold before the next
    holdMs: 500,
    mergeMs: 0,
  },
  // money, levels + cash: src/floors/spillwayEvent: a pool spills a curtain
  // of cash down past every bar
  spillwayEvent: {
    chance: 0.01,
    feedMs: 380, // the river filling the pool
    sheetMs: 900, // the curtain's fall top to bottom
    levelShare: 0.1, // of each bar's levels
    holdMs: 300,
    mergeMs: 500,
  },
  // money, cash: src/floors/crosscurrentsEvent: two rivers weave up, crossing
  crosscurrentsEvent: {
    chance: 0.01,
    travelMs: 1400, // each river's run up into the total
    holdMs: 250,
    mergeMs: 500,
  },
  // money, tiers + cash: src/floors/oxbowEvent: a river loops round each bar
  oxbowEvent: {
    chance: 0.01,
    loopsMs: [700, 480] as [number, number], // each river's run, quickening
    holdMs: 300,
    mergeMs: 500,
  },
  // money, worker tiers + cash: src/floors/breakersEvent: waves crash on workers
  breakersEvent: {
    chance: 0.01,
    gapsMs: [300, 160] as [number, number], // between waves, quickening
    waveMs: 520, // each wave's surge up and over
    holdMs: 300,
    mergeMs: 500,
  },
  // money, hires + cash: src/floors/rivuletsEvent: trickles meet at each spot
  rivuletsEvent: {
    chance: 0.01,
    gapsMs: [240, 120] as [number, number], // between pairs, quickening
    runMs: 560, // each trickle's run in from the edge
    holdMs: 300,
    mergeMs: 500,
  },
  // money, a free floor + cash: src/floors/torrentEvent: a zigzag torrent up
  torrentEvent: {
    chance: 0.01,
    climbMs: 1200, // the torrent's climb to the lock
    holdMs: 500,
    mergeMs: 300,
  },
  // wisp, levels: src/floors/lissajousEvent: a Lissajous figure over the bars
  lissajousEvent: {
    chance: 0.01,
    traceMs: 1700, // the figure, quickening
    levelShare: 0.03, // of a bar's levels, per crossing
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, tiers: src/floors/moonHopEvent: orbits each bar and slingshots on
  moonHopEvent: {
    chance: 0.01,
    orbitsMs: [560, 360] as [number, number], // each orbit, quickening
    hopMs: 160, // each slingshot to the next orbit
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, hires: src/floors/peekabooEvent: wisps peek, duck and spring up
  peekabooEvent: {
    chance: 0.01,
    gapsMs: [240, 130] as [number, number], // between spots, quickening
    peekMs: 440, // each peek, duck and spring
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, worker tiers: src/floors/tiltAWhirlEvent: a whirling ride per worker
  tiltAWhirlEvent: {
    chance: 0.01,
    spinsMs: [560, 360] as [number, number], // each whirl, quickening
    hopMs: 150, // the ride's hop to the next worker
    holdMs: 500,
    mergeMs: 0,
  },
  // wisp, cash: src/floors/waterStriderEvent: darting glides that ripple coins
  waterStriderEvent: {
    chance: 0.01,
    glidesMs: [260, 110] as [number, number], // each glide, quickening
    holdMs: 250,
    mergeMs: 500,
  },
  // wisp, a free floor: src/floors/ropeClimbEvent: hand over hand up to the lock
  ropeClimbEvent: {
    chance: 0.01,
    pullsMs: [190, 110] as [number, number], // each pull, quickening
    holdMs: 500,
    mergeMs: 0,
  },
  // experiment, cash: src/floors/tileFlipEvent: the screen flips to gold in tiles
  tileFlipEvent: {
    chance: 0.01,
    waveMs: 700, // the flip wave racing out
    flipMs: 220, // each tile flipping
    showMs: 250, // the screen all gold
    backMs: 200, // every tile flipping back
    holdMs: 300,
    mergeMs: 500,
  },
  // mix, levels + tier + cash: src/floors/whipEvent: a whip of flowing cash
  // cracks against the bars
  whipEvent: {
    chance: 0.01,
    unfurlMs: 300, // the whip pouring out of the button
    cracksMs: [380, 220] as [number, number], // between cracks, quickening
    levelShare: 0.1, // of a bar's levels, per crack
    sweepMs: 280, // the whip's cash setting off for the total
    flightMs: 360, // each coin's flight into the total
    holdMs: 300,
    mergeMs: 500,
  },
  // beam, levels: src/floors/batteryEvent: every bar fires a laser blast
  batteryEvent: {
    chance: 0.01,
    gapsMs: [260, 110] as [number, number], // between shots, quickening
    aimMs: 120, // each shot's aim laser
    fireMs: 160, // each shot blazing
    volleyMs: 300, // every bar firing at once
    levelShare: 0.06, // of a bar's levels, per shot
    holdMs: 700,
    mergeMs: 0,
  },
  // lightning, levels + worker tiers: src/floors/teslaCoilEvent: a coil
  // throws ever longer arcs
  teslaCoilEvent: {
    chance: 0.01,
    pulseGapsMs: [360, 200] as [number, number], // between pulses, quickening
    arcMs: 160, // each pulse's arcs crackling
    overloadMs: 320, // the coil overloading
    levelShare: 0.04, // of a bar's levels, per arc
    holdMs: 700,
    mergeMs: 0,
  },
  // lightning, levels: src/floors/jacobsLadderEvent: an arc climbs the building
  jacobsLadderEvent: {
    chance: 0.01,
    igniteMs: 260, // the arc striking up between its electrodes
    climbMs: 1_200, // climbing to the top of the screen
    levelShare: 0.12, // of each bar's levels
    holdMs: 700,
    mergeMs: 0,
  },
  // experiment, mixed rewards: src/floors/comicBookEvent: comic-book sound
  // effects slam over every reward
  comicBookEvent: {
    chance: 0.01,
    gapsMs: [330, 160] as [number, number], // between hits, quickening
    levelShare: 0.1, // of a bar's levels
    holdMs: 800,
    mergeMs: 0,
  },

  // src/floors/slashEvent — the rare "Slash" event: three fast cuts rip
  // across the screen, smoulder, then burst open blasting coins into the total
  slashEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    slashMs: 110, // each cut streaking across
    gapMs: 170, // between cuts
    smoulderMs: 300, // the cuts glowing ever brighter before they burst
    holdMs: 500, // the coins hanging after the burst
    mergeMs: 500,
  },

  // src/floors/jackhammerEvent — the rare "Jackhammer" event: the wisp
  // jackhammers the button ever faster, popping coins, then blows apart on it
  // spraying coins over the screen into the total
  jackhammerEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    hammerMs: 1_100, // the taps speeding up to a frenzy
    holdMs: 450, // the coins hanging after the blast
    mergeMs: 500,
  },

  // src/floors/pummelEvent — the rare "Pummel" event: a swarm of wisps
  // slams into the clicked floor's income bar from every side, then it slams
  // in an explosion and jumps one crit tier
  pummelEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    strikeMs: 140, // each wisp's wind-up and dash into the bar
    bounceMs: 150, // bouncing back off it to its spot
    holdMs: 450, // after the finale lands, before the screen unfreezes
  },

  // src/floors/overloadEvent — the rare "Overload" event: the clicked floor's
  // income bar overheats, shuddering and sparking ever harder, then blows in a
  // huge explosion and jumps one crit tier
  overloadEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    chargeMs: 1_000, // overheating
    suckMs: 110, // sucking in before it blows
    holdMs: 600, // after the blast, before the screen unfreezes
  },

  // src/floors/gatlingEvent — the rare "Gatling" event: wisps fire in like
  // gatling bullets, each hitting the button and knocking coins out round it,
  // which merge into the total
  gatlingEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    fireMs: 1_100, // the burst of fire, speeding up
    travelMs: 80, // each bullet's flight to the button
    holdMs: 450, // the coins hanging after the last round
    mergeMs: 500,
  },

  // src/floors/pressEvent — the rare "Press" event: two glowing plates slam
  // the clicked floor's income bar, bouncing off it, then grind it flat until
  // it explodes out, bursting coins into the total
  pressEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    slamMs: 140, // slamming in from off the screen
    bounceMs: 150, // bouncing back off the bar
    reslamMs: 100, // each slam after a bounce
    grindMs: 380, // grinding it down until it's almost gone
    retractMs: 220, // the plates thrown back off the screen by the blast
    holdMs: 450, // the coins hanging after the blast
    mergeMs: 500,
  },

  // src/floors/drillEvent — the rare "Drill" event: the wisp drills through
  // the clicked floor's income bar from the left and bursts out the other
  // side, spraying coins into the total
  drillEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    approachMs: 240, // rocketing in to the bar
    drillMs: 720, // grinding through it against the resistance
    exitMs: 160, // shooting on off the screen
    holdMs: 450, // the coins hanging after it bursts out
    mergeMs: 500,
  },

  // src/floors/burrowEvent — the rare "Burrow" event: the wisp falls onto
  // the clicked floor's upgrade button and bores in, bending it down at the
  // middle until it explodes, bursting money into the total
  burrowEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    fallMs: 260, // falling onto the button
    pushMs: 680, // boring in, bending it ever deeper
    holdMs: 450, // the coins hanging after it blows
    mergeMs: 500,
  },

  // src/floors/pingPongEvent — the rare "Ping Pong" event: a wisp bounces
  // between the clicked floor's income bar and the roof (the bar above, if
  // open), each bar hit knocking coins into the total; pays once per bar hit
  pingPongEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    approachMs: 180, // flying in to its first hit
    firstRallyMs: 120, // between the first two hits, shrinking to
    lastRallyMs: 55, // between the last two
    holdMs: 450, // the coins hanging after the smash
    mergeMs: 500,
  },

  // src/floors/slamDunkEvent — the rare "Slam Dunk" event: the wisp dribbles
  // across the clicked floor, leaps and dunks into the total readout, which
  // explodes in coins that merge back into it
  slamDunkEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    // the drop in, then each dribble, quicker and quicker
    bounceMs: [200, 190, 160, 135, 115],
    riseMs: 320, // leaping up over the total
    dunkMs: 110, // slamming down into it
    holdMs: 450, // the coins hanging after the dunk
    mergeMs: 500,
  },

  // src/floors/uppercutEvent — the rare "Uppercut" event: the wisp
  // uppercuts the clicked floor's income bar into the air; it flips and
  // crashes back down with free upgrade levels
  uppercutEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    swoopMs: 300, // swooping in under the bar
    riseMs: 360, // the bar flying up, flipping
    hangMs: 110, // hanging at the top
    fallMs: 170, // crashing back down
    holdMs: 600, // after it lands, before the screen unfreezes
    levelShare: 0.1, // free levels, of the floor's current level
    minLevels: 10,
  },

  // src/floors/headHopEvent — the rare "Head Hop" event: the wisp hops
  // across the clicked floor's workers' heads, each squashing and climbing a
  // perma tier
  headHopEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    entryMs: 300, // dropping in onto the first head
    firstHopMs: 260, // the first hop, shrinking to
    lastHopMs: 140, // the last
    launchMs: 280, // rocketing up off the last head
    holdMs: 650, // after the last head, before the screen unfreezes
  },

  // src/floors/paparazziEvent — the rare "Paparazzi" event: camera flashes
  // go off round the clicked floor's workers, ever faster; each worker caught
  // climbs a perma tier, then every camera fires at once
  paparazziEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    flashMs: 1_200, // the random flashes, piling up toward the end
    finalGapMs: 120, // after the last flash, every camera at once
    holdMs: 650, // after that, before the screen unfreezes
  },

  // src/floors/missileBarrageEvent — the rare "Missile Barrage" event: a
  // volley of wisp missiles streaks up into every income bar in view, each
  // hit landing free upgrade levels
  missileBarrageEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    gapMs: 75, // between launches
    flightMs: 420, // each missile's flight
    holdMs: 650, // after the last hit, before the screen unfreezes
    levelShare: 0.1, // free levels per bar, of its floor's current level
    minLevels: 10,
  },

  // src/floors/sonicBoomEvent — the rare "Sonic Boom" event: the wisp revs
  // up near the middle of the screen, then bursts off it leaving a ball and
  // a trail of money behind that merge into the total
  sonicBoomEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    glideMs: 360, // gliding in and pulling up
    revMs: 520, // revving up
    burstMs: 130, // tearing off the screen
    holdMs: 450, // the coins hanging after it's gone
    mergeMs: 500,
  },

  // src/floors/mitosisEvent — the rare "Mitosis" event: the wisp splits in
  // two again and again, bouncing round the screen, until the swarm blows at
  // once, spraying coins into the total
  mitosisEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    // each generation's flight before it splits (the last: before it blows)
    genMs: [360, 290, 230, 185, 150, 130],
    holdMs: 450, // the coins hanging after the swarm blows
    mergeMs: 500,
  },

  // src/floors/plinkoEvent — the rare "Plinko" event: wisp balls clatter
  // down a triangle of pegs, each hit a coin, and slam into the bottom,
  // spraying coins into the total
  plinkoEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    // when each ball drops in, ever quicker
    dropAt: [0, 170, 310, 430, 530, 610],
    holdMs: 450, // the coins hanging after the last lands
    mergeMs: 500,
  },

  // src/floors/hammerThrowEvent — the rare "Hammer Throw" event: the wisp
  // whirls round the clicked floor's button, then is flung into the screen's
  // edge, bursting coins back across the screen into the total
  hammerThrowEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    whirlMs: 1_100, // whirling ever faster before it's let go
    holdMs: 450, // the coins hanging after it hits
    mergeMs: 500,
  },

  // src/floors/snakeEvent — the rare "Snake" event: the wisp heads a snake
  // of coins that gobbles wisps over the screen, growing, until it bites the
  // big one on the button and blows, its coins merging into the total
  snakeEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    runMs: 1_800, // slithering its whole route, ever faster
    holdMs: 450, // the coins hanging after it blows
    mergeMs: 500,
  },

  // src/floors/breakoutEvent — the rare "Breakout" event: the clicked
  // floor's income bar bats the wisp up through a wall of bricks, each
  // smashing into coins, until the rest blow at once into the total
  breakoutEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    dropMs: 180, // the wall slamming down
    // each volley's climb from the bar to the top, ever quicker (its fall's as long)
    upMs: [320, 270, 225, 190, 165],
    holdMs: 450, // the coins hanging after the wall blows
    mergeMs: 500,
  },

  // src/floors/lineClearEvent — the rare "Line Clear" event: blocks
  // hard-drop and stack into four full rows, which clear at once in a blast
  // of coins into the total
  lineClearEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    // when each piece slams down, ever quicker
    landAt: [300, 510, 690, 850, 990, 1_110, 1_215, 1_310, 1_395, 1_475],
    blinkMs: 260, // the full rows blinking before they clear
    holdMs: 450, // the coins hanging after the clear
    mergeMs: 500,
  },

  // src/floors/breakShotEvent — the rare "Break Shot" event: the wisp breaks
  // a rack of pool balls, which scatter and then pop into coins for the total
  breakShotEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    popMs: 2_200, // the cue's run in and the scatter, before the balls pop
    holdMs: 450, // the coins hanging after the pop
    mergeMs: 500,
  },

  // src/floors/bulletHellEvent — the rare "Bullet Hell" event: the wisp
  // sprays spiral arms of wisps that pop into coins at the screen's edges,
  // then blows in a last ring; the coins merge into the total
  bulletHellEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    emitMs: 1_300, // spraying, ever faster, before it blows
    holdMs: 450, // the coins hanging after the last pops
    mergeMs: 500,
  },

  // src/floors/vortexEvent — the rare "Vortex" event: like Stream, but the
  // coins pour in from every screen edge and swirl into the total
  vortexEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 900, // how long coins keep pouring in
    travelMs: 500, // each coin's swirl into the eye
  },

  // src/floors/ricochetEvent — the rare "Ricochet" event: one fat stream
  // bounces off the screen's edges 3-5 times before diving into the total,
  // paying the floor's payout once per bounce
  ricochetEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    travelMs: 500, // each coin's trip, bounces and all
  },

  // src/floors/waterfallEvent — the rare "Waterfall" event: coins spill off the
  // top button in view and cascade down the building's side from button to
  // button, each tipping in more, then pour into the total; pays the floor's
  // payout once per button the falls pass
  waterfallEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    dropMs: 250, // each coin's fall from one button to the next
    maxFloors: 5, // the most buttons the falls cascade over
  },

  // src/floors/conveyorEvent — the rare "Conveyor" event: glimmer hooks glide
  // in straight along a rail, one per worker a floor in view is missing, and
  // drop each onto the floor: it fills up to its worker cap
  conveyorEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    crossMs: 900, // a hook gliding the floor's whole width
    staggerMs: 300, // between one hook setting off and the next
    holdMs: 700, // after the last worker lands, before the screen unfreezes
  },

  // src/floors/firefliesEvent — the rare "Fireflies" event: one firefly per
  // worker a floor in view is missing drifts in and wanders the floor, then
  // each settles into an empty spot as a new worker: it fills up to its cap
  firefliesEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    enterMs: 600, // a firefly drifting in from the screen's edge
    wanderMs: 1_000, // them all wandering the floor before the first settles
    settleMs: 450, // a firefly gliding into its spot
    gapMs: 300, // between one settling and the next
    holdMs: 700, // after the last worker forms, before the screen unfreezes
  },

  // src/floors/paydayEvent — the rare "Payday" event: every on-screen worker
  // streams coins into the clicked floor's button, which fires them into the
  // total, paying the floor's payout once per worker
  paydayEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    gatherMs: 700, // the workers paying into the button
    payoutMs: 700, // the button firing it all into the total
    maxWorkers: 3,
  },

  // src/floors/piggyBankEvent — the rare "Piggy Bank" event: the button streams
  // coins into a piggy bank that swells and wiggles, then bursts, showering
  // the screen with coins that merge into the total
  piggyBankEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    fillMs: 900, // the button filling the piggy
    durationMs: 1_000, // after the burst: ~0.3s blast out, 0.2s hang, then the merge
    mergeMs: 500,
    rewardMultiplier: 3, // on top of the floor's income times its floor number
  },

  // src/floors/coinTossEvent — the rare "Coin Toss" event: the button streams
  // coins into one giant coin that's tossed high, flips and lands heads or
  // tails, then bursts into coins that merge into the total
  coinTossEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    fillMs: 900, // the button filling the giant coin
    flipMs: 900, // the toss, up and back down
    showMs: 500, // heads or tails showing before it bursts
    durationMs: 1_000, // after the burst: blast out, hang, then the merge
    mergeMs: 500,
    headsMultiplier: 3, // on top of the floor's income times its floor number
    tailsMultiplier: 2,
  },

  // src/floors/hourglassEvent — the rare "Hourglass" event: the button pours
  // coins into an hourglass that flips over, and they trickle out of it into
  // the total; pays `seconds` of the building's income
  hourglassEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    fillMs: 900, // the button filling the hourglass
    flipMs: 500, // it turning over
    drainMs: 1_400, // the coins trickling out into the total
    seconds: 60,
  },

  // src/floors/rocketEvent — the rare "Rocket" event: the button pours coins
  // into a rocket on the clicked floor that launches up through the floors in
  // view and bursts into a coin firework that merges into the total; pays once
  // more per floor it flies past
  rocketEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    fillMs: 900, // the button filling the rocket
    flyMs: 450, // its flight up to the burst
    durationMs: 1_000, // after the burst: blast out, hang, then the merge
    mergeMs: 500,
  },

  // src/floors/revealStage — the stage every reveal event plays its reveal on
  revealStage: {
    windUpMs: 220, // the screen leaning in and rumbling before each whip
    slideMs: 420, // the whip pan in over the floors, and back out
  },

  // src/floors/revealEvent — the rare "Reveal" event: on the reveal stage, a
  // wisp bumps the silhouette of a badge never landed into a spin that flips
  // it to the badge's art, and then that crit lands on the floor
  revealEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    flyMs: 750, // the wisp swooping in from off screen to over the badge
    hoverMs: 250, // it hovering there
    bumpMs: 380, // it dipping to bump the badge's head and bouncing back up
    spinUpMs: 600, // the shadow spinning ever faster until it flips to the art
    correctMs: 500, // the art's spins overshooting, then turning back to face front
    holdMs: 300, // the settled badge and its name
  },

  // src/floors/jackpotReelsEvent — the rare "Jackpot Reels" event: the button
  // streams coins into three slot reels, which stop one by one with a slam;
  // it pays the floor's income times its floor number times the reels' sum
  jackpotReelsEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    spinMs: 1_000, // until the first reel stops
    stopGapMs: 400, // between one reel stopping and the next
    holdMs: 700, // after the last stop, before the reels burst into coins
    durationMs: 1_000, // after the burst: ~0.3s blast out, 0.2s hang, then the merge
    mergeMs: 500,
    // each reel's multipliers and how often it stops on them
    symbols: [
      { value: 1, weight: 60 },
      { value: 2, weight: 30 },
      { value: 5, weight: 10 },
    ],
    matchBonus: 3, // the sum's multiplier when all three reels match
  },

  // src/floors/chainPayEvent — the rare "Chain Pay" event: a coin stream hops
  // from the button through on-screen workers into the total; the n-th worker
  // reached pays the floor's payout n times over
  chainPayEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    hopMs: 450, // each hop from one stop to the next
    payoutMs: 700, // the last worker firing it all into the total
    maxWorkers: 8,
  },

  // src/floors/twisterEvent — the rare "Twister" event: a funnel of coins
  // zigzags across the screen through the workers in view, sucking a short
  // stream out of each, then spins up into the total; pays the floor's payout
  // once per worker swept up
  twisterEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    formMs: 300, // the funnel spinning up on the button
    speed: 700, // its sweep, in floor px per second, kept within:
    minSweepMs: 2_000,
    maxSweepMs: 9_000,
    suckMs: 420, // each worker's stream into the funnel
    payoutMs: 700, // the funnel lifting off into the total
    maxWorkers: 10,
  },

  // src/floors/downpourEvent — the rare "Downpour" event: coins rain down from
  // above the screen and pool along its bottom, then drain into the total
  downpourEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 800, // how long it keeps raining
    travelMs: 500, // each drop's fall
    hangMs: 300, // the pool resting after the last drop lands
    mergeMs: 500, // the pool draining into the total
    rewardMultiplier: 2, // on top of the floor's income times its floor number
  },

  // src/floors/trickleEvent — the rare "Trickle" event: like Downpour, but the
  // coins bounce on every floor in view on their way down to the pool
  trickleEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 800, // how long it keeps raining
    travelMs: 1_100, // each drop's fall, bounces and all
    hangMs: 100, // the pool resting after the last drop lands
    mergeMs: 500, // the pool draining into the total
    rewardMultiplier: 2, // on top of the floor's income times its floor number
  },

  // src/floors/magnetEvent — the rare "Magnet" event: a big magnet yanks coins
  // in from all over the screen, then flings them into the total, paying the
  // floor's income times its floor number once per floor on screen
  magnetEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 700, // how long coins keep popping up
    travelMs: 600, // each coin's pull into the magnet
    mergeMs: 500, // the fling into the total
  },

  // src/floors/spilloverEvent — the rare "Spillover" event: the button pours
  // coins into the income bar until it brims over and spills into the total;
  // pays the full bar plus bonusPayouts more, and restarts the bar
  spilloverEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    fillMs: 1_000, // the button filling the bar
    spillMs: 800, // the overflow spilling into the total
    bonusPayouts: 2,
  },

  // src/floors/constellationEvent — the rare "Constellation" event: a light
  // links several on-screen workers into a star, then each flares and climbs
  // one perma tier
  constellationEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    appearMs: 500, // the stars twinkling up over the workers
    linkMs: 800, // the light drawing the whole star
    flareGapMs: 220, // between one star flaring and the next
    maxStars: 7, // at least 3 promotable workers in view are needed
  },

  // src/floors/ascendEvent — the rare "Ascend" event: a wisp zigzags up
  // the building touching each income bar in view, +1 perma tier each
  ascendEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    hopMs: 450, // each hop from one bar to the next
    maxFloors: 6, // the most bars it touches
  },

  // src/floors/risingTideEvent — the rare "Rising Tide" event: blue water
  // floods up the building, lifting every floor in view to the highest floor
  // tier among them
  risingTideEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    riseMs: 2_200, // the tide rising from below the screen to above it
    fadeMs: 400, // it fading away once risen
    holdMs: 600, // after it fades, before the screen unfreezes
  },

  // src/floors/tidalWaveEvent — the rare "Tidal Wave" event: a wall of water
  // sweeps across the screen, lifting floors like the Rising Tide
  tidalWaveEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    sweepMs: 1200, // the wave rolling in from one side until it's fully out the other
  },

  // src/floors/beanstalkEvent — the rare "Beanstalk" event: a vine of light
  // winds up round the locked floor and the one above it, unlocking both
  beanstalkEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    growMs: 2_400, // the vine climbing from the top floor up past the locked one
    holdMs: 500, // after it blooms, before the screen unfreezes
    secondUnlockMs: 450, // between the two floors unlocking
  },

  // src/floors/blessingEvent — the rare "Blessing" event: golden glimmers snow
  // down over the clicked floor, one settling on each worker, +1 perma tier each
  blessingEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    snowMs: 1_500, // how long flakes keep starting to fall
  },

  // src/floors/haloEvent — the rare "Halo" event: glimmer lights orbit the
  // lowest-tier worker in view and settle as a halo on its head, which jumps
  // straight to the top perma tier
  haloEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    gatherMs: 800, // the lights spiralling in to orbit the worker
    orbitMs: 200, // circling it
    settleMs: 600, // shrinking into the halo
    holdMs: 900, // the halo glowing before the screen unfreezes
  },

  // src/floors/cometEvent — the rare "Comet" event: a big light streaks
  // diagonally down into a worker and explodes, each worker in the blast
  // climbing one perma tier
  cometEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streakMs: 500, // the comet coming down from above the screen into its worker
    holdMs: 900, // the explosion, before the screen unfreezes
  },

  // src/floors/meteorShowerEvent — the rare "Meteor Shower" event: 3-6
  // shooting stars streak down one after another, each striking a different
  // worker, which climbs one perma tier
  meteorShowerEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    minMeteors: 3,
    maxMeteors: 6,
    gapMs: 260, // between one meteor's launch and the next
    streakMs: 450, // each meteor coming down from above the screen into its worker
    holdMs: 800, // after the last strike, before the screen unfreezes
  },

  // src/floors/mentorEvent — the rare "Mentor" event: the top-tier worker in
  // view streams lights into the lowest-tier one, which climbs up to two tiers
  mentorEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 1800, // the lights streaming over; a tier halfway and one at the end
    holdMs: 700, // after the last tier, before the screen unfreezes
  },

  // src/floors/sparkChainEvent — the rare "Spark Chain" event: a light jumps
  // like lightning worker to worker, faster each jump, each struck worker
  // climbing one perma tier, until it fizzles on the first maxed one
  sparkChainEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    firstJumpMs: 550, // the first jump, flight plus rest on the worker
    speedUp: 0.82, // each jump takes this much of the one before
    maxJumps: 10,
    holdMs: 600, // after the last strike, before the screen unfreezes
  },

  // src/floors/polishEvent — the rare "Polish" event: lights swirl round the
  // upgrade button and buff it until it shines, granting free upgrade levels
  polishEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    swirlMs: 1_800, // the lights swirling in and buffing the button
    holdMs: 1_200, // after the shine lands, before the screen unfreezes
    levelShare: 0.1, // free levels, of the floor's current level
    minLevels: 10,
  },

  // src/floors/lighthouseEvent — the rare "Lighthouse" event: a lamp in the
  // middle of the screen sweeps its beam one full turn round; every upgrade
  // button in view it lights shines, granting free upgrade levels
  lighthouseEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    flyMs: 450, // the wisp flying up out of the button to the lamp's spot
    sweepMs: 2_400, // the beam's one full turn
    holdMs: 900, // after the beam fades, before the screen unfreezes
    levelShare: 0.1, // free levels per floor, of its current level
    minLevels: 10,
  },

  // src/floors/recruitEvent — the rare "Recruit" event: lights stream into an
  // empty spot on a floor in view and form a new worker there, a free hire
  recruitEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 1_800, // the lights streaming in and the worker forming
    holdMs: 900, // after the new worker lands, before the screen unfreezes
  },

  // src/floors/promotionDayEvent — the rare "Promotion Day" event: lights rise
  // from every worker on the clicked floor into its income bar, which climbs
  // one crit tier
  promotionDayEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 1_800, // the lights rising into the bar
    holdMs: 900, // after the promotion lands, before the screen unfreezes
  },

  // src/floors/alchemyEvent — the rare "Alchemy" event: the button pours coins
  // into a cauldron that bubbles up and shoots lights into the lowest-tier
  // worker on the floor: it climbs one perma tier and the floor pays out
  alchemyEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    brewMs: 1_400, // coins pouring in, the brew bubbling up
    shootMs: 800, // the lights shooting into the worker
    holdMs: 800, // after the worker lands, before the screen unfreezes
    payouts: 2, // the floor's payouts paid with the promotion
  },

  // src/floors/investmentEvent — the rare "Investment" event: the button pours
  // coins into the income bar until it slams full and pays out, then lights
  // burst out of the bar into the button and the floor climbs one crit tier
  investmentEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    fillMs: 1_000, // the coins filling the bar
    liftMs: 900, // the lights bursting from the bar into the button
    holdMs: 900, // after the promotion lands, before the screen unfreezes
    payouts: 3, // the full bar's payout times this, paid as it slams
  },

  // src/floors/dividendsEvent — the rare "Dividends" event: lights stream from
  // the button into the lowest-tier worker in view, which climbs one perma
  // tier, then sprays a coin stream into the total
  dividendsEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    liftMs: 900, // the lights streaming into the worker
    sprayMs: 900, // the worker's coins spraying into the total
    payouts: 3, // the worker's floor's payouts paid into the total
  },

  // src/floors/wispEvent — the rare "Wisp" event: a playful wisp flits
  // between targets in view sprinkling glitter: a worker climbs one perma
  // tier, an income bar one crit tier, a "Lvl N" label gains free levels
  wispEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    flyMs: 550, // each swoop to the next target, and off the screen
    sprinkleMs: 1_100, // sweeping back and forth over a target, sprinkling it
    holdMs: 400, // after it's gone, before the screen unfreezes
    minStops: 1,
    maxStops: 5,
    levels: 10, // free levels for a sprinkled "Lvl N" label
  },

  // src/floors/streamEvent — the rare "Stream" event: like Spray, but the coins
  // flow as a river winding and looping across the screen into the total; the
  // button pours until its head arrives, so the whole event lasts ~2x travelMs
  streamEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    travelMs: 8_00, // each coin's trip down the river
  },

  // src/floors/trailsEvent — the rare "Trails" event: like Stream, but many
  // short streams leave the button one after another, each winding into the total
  trailsEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    spreadMs: 900, // from the first trail leaving the button to the last
    pourMs: 200, // how long the button pours each trail
    travelMs: 400, // each coin's trip down its trail
  },

  // src/floors/drawEvent — the rare "Draw" event: like Spray, but the stream
  // draws the crit's own 5/25/125 and the payout is multiplied by it
  drawEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 600, // how long the number takes to draw
    durationMs: 1_600, // stream, ~0.3s last coin out, 0.4s hang, then the merge
    mergeMs: 500,
  },

  // src/floors/nightSkyEvent — the rare "Night Sky" event: the wisp traces
  // the crit's own 5/25/125 in twinkling stars, which stream into the total;
  // pays like Draw
  nightSkyEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    flightMs: 2_300, // the wisp's whole flight, out of the button and off the screen
    hopMs: 120, // added per hop between strokes
    showMs: 400, // the finished number twinkling before its stars fly
    mergeSpreadMs: 300, // from the first star leaving for the total to the last
    mergeFlyMs: 500, // each star's flight into the total
  },

  // src/floors/pitcherEvent — the rare "Pitcher" event: the wisp draws the
  // crit's own 5/25/125 in solid lines open at the top, and money pours down
  // into each finished digit, filling it; pays like Draw
  pitcherEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    flightMs: 2_300, // the wisp's whole flight, out of the button and off the screen
    hopMs: 120, // added per hop between strokes
    gapShare: 0.14, // the open top of each digit, of its height
    pourDelayMs: 120, // from a digit's last line to its pour
    pourMs: 800, // how long each digit's pour lasts
    travelMs: 650, // each coin's fall from the top of the screen to its spot
    hangMs: 400, // the full number hanging before the merge
    mergeMs: 500,
    breakSpreadMs: 150, // the lines' sparkles leaving for the total, first to last
    breakFlyMs: 350, // each sparkle's flight into the total
  },

  // src/floors/swarmEvent — the rare "Swarm" event: its proc animation leaves
  // that button armed; clicking it starts a timed swarm sale where every click
  // on it pays a Sale payout from it and each of its mirrored clones
  swarmEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    durationMs: 15_000,
  },

  // src/floors/renovateEvent — the rare "Renovate" event: its crit's click
  // streams coins into that floor's "Lvl N" label, then lands one regular crit
  // tier on the floor (x5/x25/x125, weighted by the crit tier odds)
  renovateEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
  },

  // src/floors/upgradeEvent — the rare "Upgrade" event: its crit's click
  // streams coins into that floor's income bar, then promotes the floor's
  // permanent crit tier to the crit's tier (or one above its own); never on a
  // top-tier floor
  upgradeEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
  },

  // src/floors/unlockEvent — the rare "Unlock" event, only on a floor one or
  // two below the locked floor: its crit's click streams coins into that
  // floor's unlock price, then unlocks it for free with its own unlock crit roll
  unlockEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
  },

  // src/floors/upgradeButton/index.ts — the purchasable "Work overtime" boost.
  // Each free click during the event adds a tick (crit-scaled, see
  // CRIT_TIER_CONFIG) to the floor's own overtime gauge (incomePanel.ts).
  overtime: {
    tickGoal: 125, // base goal for a floor with no permanent crit tier yet
    // a floor's CURRENT permanent crit tier raises its own gauge's goal further
    // (multiplies the base tickGoal above) — a higher tier already earns more
    // per tick, so its own gauge should take proportionally longer to fill
    tickGoalMultiplierByTier: {
      crit: 2,
      mega: 4,
      ultra: 4,
    },
  },

  // src/hud/upgradeMenu/index.ts — per-floor worker/office-upgrade pricing.
  upgradeMenu: {
    workerBasePriceFloor1: 100,
    managerMinUpgradeCount: 50, // a floor must be upgraded this many times to hire a manager
  },

  // src/floors/incomePanel/index.ts's officeUpgradeSpeedMultiplier — each of
  // office chairs / office supplies / a manager doubles a floor's speed once
  // owned; all three stack multiplicatively (up to 8x total).
  officeUpgrades: {
    speedMultiplierPerUpgrade: 2,
  },

  // src/hud/corporationBoostMenu/economy.ts — corporation-wide modifiers.
  corporation: {
    // sqrt(log10(amount)) * this rate — the shared "$ amount -> a small,
    // steadily-growing global-boost %" conversion a company's own
    // size-based baseline contribution uses (see getCompanyBaseModifierPercent)
    baseModifierRate: 0.5,
  },
} as const;
