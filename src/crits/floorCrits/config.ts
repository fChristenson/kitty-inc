// the floor crits a floorCrit slot (CONFIG.specialCrits) picks from, each by
// its chance relative to their sum; spread into CONFIG via crits/config.ts
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
    // its number's characters firing into its floor's bar
    rapidFireCrit: {
      chance: 0.04,
    },
    // the floor crits playing their number onto the bars: once its number has slammed in, it pinballs between
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
    // it stamps down onto each bar leaving a glowing print, or is catapulted
    // off the top to crash down through them all
    stampCrit: {
      chance: 0.03,
    },
    catapultCrit: {
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
    // every bar blasting off like a rocket and screaming back into place
    liftoffCrit: {
      chance: 0.03,
    },
    // a gunship circling over the building, raking each bar with tracers,
    // then one cannon round onto its own
    gunshipCrit: {
      chance: 0.03,
    },
    // a beam of frost icing every bar over, then the ice shattering down them
    freezeRayCrit: {
      chance: 0.03,
    },
    // a ring of missiles looping out and crisscrossing back, raining onto
    // every bar in a rattling cluster of blasts
    missileTangleCrit: {
      chance: 0.03,
    },
    // a hub of four beam blades spinning up, blasting every bar they sweep,
    // then flying off onto the bars
    windmillCrit: {
      chance: 0.03,
    },
    // a glitter ring spreading out round a planet, blasts racing along each
    // bar it cuts, then shattering onto the bars
    saturnCrit: {
      chance: 0.03,
    },
    // a rhythm game: circles on the bars hit on the beat by a cursor wisp,
    // quicker and quicker, then a spinner into a huge blast
    beatmapCrit: {
      chance: 0.03,
    },
  },
} as const;
