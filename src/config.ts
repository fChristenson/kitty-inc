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
    snowMs: 2_400, // how long flakes keep starting to fall
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
