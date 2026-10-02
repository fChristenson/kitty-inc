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
