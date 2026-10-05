import { createFeaturedCritRewards } from "./featuredRewards";
import { CONFIG } from "../../config";
import type { FeaturedRewardContext } from "../../shared/critTypes";
import {
  isDetachedJobRunning,
  isDetachedJobPending,
  isFloorLocked,
  liveEffect,
} from "../../shared/detachedJob";
import {
  hitTestWorkers,
  clickWorker,
  applyBoostAll,
  triggerJumpAll as animateJumpAll,
  getRenderedWorkerCount,
  MAX_RENDERED_WORKERS,
  getBoostEventCandidates,
  promoteWorkerPermaTier,
  celebrateWorkerBoost,
} from "../worker";
import {
  hitTestUpgradeButton,
  getButtonCenter,
  triggerButtonPress as animateButtonPress,
  isCritUpgrade,
  getCritTier,
  getBonusTierCrit,
  consumeBonusTierCrit,
  SEASONAL_SALE_DISCOUNT_MULTIPLIER,
  HALLOWEEN_SALE_DISCOUNT_MULTIPLIER,
  EASTER_SALE_DISCOUNT_MULTIPLIER,
  POKER_HAND_CRIT_COUNTS,
  consumeCritUpgrade,
  rollCritUpgrade,
  rollFloorBuyCrit,
  rollInstantCrit,
  nextCritTier,
  isSaleActive,
  triggerSaleBoost,
  isOvertimeActive,
  triggerFrozenCrit,
  triggerSpendingFreeze,
  triggerRushHourCrit,
  triggerRateLockCrit,
  armGuaranteedUltraCrit,
  armCritUpgrade,
  armGuaranteedMegaCrit,
  LUCKY_CLOVER_CRIT_COUNT,
  LUCKY_CLOVER_CRIT_TIER,
  ROUND_UP_CRIT_STEP,
  SAFETY_NET_CRIT_UPGRADES,
  CASUAL_FRIDAY_CRIT_UPGRADES,
  FANCY_FRIDAY_CRIT_UPGRADES,
  DOUBLE_DOWN_CRIT_REPEATS,
  endOvertimeActiveWindow,
  canCancelOvertime,
  tapOvertimeBar,
  addOvertimeTicks,
  getOvertimeTicks,
  getOvertimeTickGoal,
  isUpgradeButtonEnabled,
  type CritTier,
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
  RAIN_CHECK_CRIT_SECONDS,
  MYSTIC_UPGRADE_COUNT,
  KEYNOTE_UPGRADE_COUNT,
  CHAIN_CRIT_CONTINUE_CHANCE,
  DOMINO_EFFECT_CONTINUE_CHANCE,
  BOUNCE_CRIT_CONTINUE_CHANCE,
  EXPLOSION_CRIT_CONTINUE_CHANCE,
  BTN_W,
  BTN_H,
  getUpgradeCost,
  isBoostEventArmed,
  disarmBoostEvent,
  isUnionEventArmed,
  disarmUnionEvent,
  isHuntEventArmed,
  disarmHuntEvent,
  isSwarmEventArmed,
  disarmSwarmEvent,
  isSwarmSaleActive,
  triggerSwarmSale,
  resolveButtonFloor,
  getButtonMirrors,
} from "../upgradeButton";
import { startBoostEvent, type OnScreenFloors } from "../boostEvent";
import { startUnionEvent } from "../unionEvent";
import { startHuntEvent } from "../huntEvent";
// registers the Swarm, Kickback, Payday, Piggy Bank, Coin Toss, Hourglass, Rocket, Reveal, Jackpot Reels, Chain Pay, Twister, Downpour, Trickle, Magnet, Spillover, Constellation, Ascend, Rising Tide, Tidal Wave, Beanstalk, Blessing, Halo, Comet, Meteor Shower, Mentor, Spark Chain, Polish, Lighthouse, Recruit, Promotion Day, Alchemy, Investment, Dividends, Wisp, Burst, Spray, Fountain, Ripple, Wrecking Ball, Piledriver, Orbital Strike, Fuse, Supernova, Bowling, Thunderclap, Chain Reaction, Bullseye, Popcorn, Newton's Cradle, Juggle, Boomerang, Heartbeat, Clash, Asteroids, Whack-a-Mole, Drumroll, Shell Game, Seesaw, Scratch, Tag, Bumpers, Catcher, Implosion, Atom, Spiral, Loop, Eternity, Helix, Yo-Yo, Racetrack, Swing, Kaleidoscope, Zipper, Screensaver, Sprinkler, Clockwork, Hole in One, Leapfrog, Lineup, Stampede, Wormhole, Splat, Roulette, Free Kick, Slalom, Lightning, Fire Hose, Confluence, Slosh, Siphon, Crossfire, Gravity Well, Splashdown, Geysers, Cash Cannon, Hoover, Air Show, Leak, Climb, Kite, Rainbow, Branches, Tug of War, Waterwheel, Braid, Skim, Lattice, Fireworks, Slingshot, Marquee, Crop Duster, Bolas, Countdown, Sparkler, Slinky, Pipeline, Prism, Trampoline, Hummingbird, Dive Bomb, Ski Jump, Jetpack, Bass Drop, Scanner, Laser Grid, Etch, Searchlights, Tractor Beam, Beam Clash, Butterfly, Kelp, Pendulum Wave, Formation, Ouroboros, Bowstring, Superlaser, Ion Storm, Glitch, Magnifier, Water Show, Mercury, Alignment, Dandelion, Bobber, Fishing, Scissors, Pulse Rifle, Split, Pixelate, Dam Burst, Spiderweb, Curtain, Jellyfish, Polarity, Collider, Sheepdog, Dragon, Reflector, Cookie Cutter, Cinematic, Negative, Chain Lightning, Lock-On, Stitch, Stockpile, Spot Weld, Reels, Cash Shower, Catherine Wheel, Multiball, Whip, Battery, Tesla Coil, Jacob's Ladder, Comic Book, Slash, Jackhammer, Pummel, Overload, Gatling, Press, Drill, Burrow, Ping Pong, Slam Dunk, Uppercut, Head Hop, Paparazzi, Missile Barrage, Sonic Boom, Mitosis, Plinko, Hammer Throw, Snake, Breakout, Line Clear, Break Shot, Bullet Hell, Vortex, Ricochet, Waterfall, Conveyor, Fireflies, Stream, Trails, Draw, Night Sky, Pitcher, Glimmer, Renovate, Upgrade and Unlock procs in the shared event pool
import "../swarmEvent";
import "../kickbackEvent";
import "../paydayEvent";
import "../piggyBankEvent";
import "../coinTossEvent";
import "../hourglassEvent";
import "../rocketEvent";
import "../revealEvent";
import "../jackpotReelsEvent";
import "../chainPayEvent";
import "../twisterEvent";
import "../downpourEvent";
import "../trickleEvent";
import "../magnetEvent";
import "../spilloverEvent";
import "../constellationEvent";
import "../ascendEvent";
import "../risingTideEvent";
import "../tidalWaveEvent";
import "../beanstalkEvent";
import "../blessingEvent";
import "../haloEvent";
import "../cometEvent";
import "../meteorShowerEvent";
import "../mentorEvent";
import "../sparkChainEvent";
import "../polishEvent";
import "../lighthouseEvent";
import "../recruitEvent";
import "../promotionDayEvent";
import "../alchemyEvent";
import "../investmentEvent";
import "../dividendsEvent";
import "../wispEvent";
import "../burstEvent";
import "../sprayEvent";
import "../fountainEvent";
import "../rippleEvent";
import "../wreckingBallEvent";
import "../piledriverEvent";
import "../orbitalStrikeEvent";
import "../fuseEvent";
import "../supernovaEvent";
import "../bowlingEvent";
import "../thunderclapEvent";
import "../chainReactionEvent";
import "../bullseyeEvent";
import "../popcornEvent";
import "../newtonsCradleEvent";
import "../juggleEvent";
import "../boomerangEvent";
import "../heartbeatEvent";
import "../clashEvent";
import "../asteroidsEvent";
import "../whackAMoleEvent";
import "../drumrollEvent";
import "../shellGameEvent";
import "../seesawEvent";
import "../scratchEvent";
import "../tagEvent";
import "../bumpersEvent";
import "../catcherEvent";
import "../implosionEvent";
import "../atomEvent";
import "../spiralEvent";
import "../loopEvent";
import "../eternityEvent";
import "../helixEvent";
import "../yoYoEvent";
import "../racetrackEvent";
import "../swingEvent";
import "../kaleidoscopeEvent";
import "../zipperEvent";
import "../screensaverEvent";
import "../sprinklerEvent";
import "../clockworkEvent";
import "../holeInOneEvent";
import "../leapfrogEvent";
import "../lineupEvent";
import "../stampedeEvent";
import "../wormholeEvent";
import "../splatEvent";
import "../rouletteEvent";
import "../freeKickEvent";
import "../slalomEvent";
import "../lightningEvent";
import "../fireHoseEvent";
import "../confluenceEvent";
import "../sloshEvent";
import "../siphonEvent";
import "../crossfireEvent";
import "../gravityWellEvent";
import "../splashdownEvent";
import "../geysersEvent";
import "../cashCannonEvent";
import "../hooverEvent";
import "../airShowEvent";
import "../leakEvent";
import "../climbEvent";
import "../kiteEvent";
import "../rainbowEvent";
import "../branchesEvent";
import "../tugOfWarEvent";
import "../waterwheelEvent";
import "../braidEvent";
import "../skimEvent";
import "../latticeEvent";
import "../fireworksEvent";
import "../slingshotEvent";
import "../marqueeEvent";
import "../cropDusterEvent";
import "../bolasEvent";
import "../countdownEvent";
import "../sparklerEvent";
import "../slinkyEvent";
import "../pipelineEvent";
import "../prismEvent";
import "../trampolineEvent";
import "../hummingbirdEvent";
import "../diveBombEvent";
import "../skiJumpEvent";
import "../jetpackEvent";
import "../bassDropEvent";
import "../scannerEvent";
import "../laserGridEvent";
import "../etchEvent";
import "../searchlightsEvent";
import "../tractorBeamEvent";
import "../beamClashEvent";
import "../butterflyEvent";
import "../kelpEvent";
import "../pendulumWaveEvent";
import "../formationEvent";
import "../ouroborosEvent";
import "../bowstringEvent";
import "../superlaserEvent";
import "../ionStormEvent";
import "../glitchEvent";
import "../magnifierEvent";
import "../waterShowEvent";
import "../mercuryEvent";
import "../alignmentEvent";
import "../dandelionEvent";
import "../bobberEvent";
import "../fishingEvent";
import "../scissorsEvent";
import "../pulseRifleEvent";
import "../splitEvent";
import "../pixelateEvent";
import "../damBurstEvent";
import "../spiderwebEvent";
import "../curtainEvent";
import "../jellyfishEvent";
import "../polarityEvent";
import "../colliderEvent";
import "../sheepdogEvent";
import "../dragonEvent";
import "../reflectorEvent";
import "../cookieCutterEvent";
import "../cinematicEvent";
import "../negativeEvent";
import "../chainLightningEvent";
import "../lockOnEvent";
import "../stitchEvent";
import "../stockpileEvent";
import "../spotWeldEvent";
import "../reelsEvent";
import "../cashShowerEvent";
import "../catherineWheelEvent";
import "../multiballEvent";
import "../whipEvent";
import "../batteryEvent";
import "../teslaCoilEvent";
import "../jacobsLadderEvent";
import "../comicBookEvent";
import "../avalancheEvent";
import "../beehiveEvent";
import "../pogoEvent";
import "../laserHarpEvent";
import "../lichtenbergEvent";
import "../shatterEvent";
import "../funnelEvent";
import "../grappleEvent";
import "../surfEvent";
import "../laserTagEvent";
import "../ballLightningEvent";
import "../eventHorizonEvent";
import "../tileFlipEvent";
import "../gusherEvent";
import "../pinataEvent";
import "../giftWrapEvent";
import "../triangulateEvent";
import "../sparkOfLifeEvent";
import "../glassRainEvent";
import "../foldEvent";
import "../cocoonEvent";
import "../gravityAssistEvent";
import "../zipLineEvent";
import "../breachEvent";
import "../stormSurgeEvent";
import "../smashAndGrabEvent";
import "../shrinkRayEvent";
import "../sandstormEvent";
import "../juggernautEvent";
import "../fuelLineEvent";
import "../checkoutEvent";
import "../lightningRodEvent";
import "../flagEvent";
import "../terracesEvent";
import "../batteringRamEvent";
import "../tetherballEvent";
import "../projectorEvent";
import "../clearEvent";
import "../infinityMirrorEvent";
import "../elevatorEvent";
import "../migrationEvent";
import "../corkscrewEvent";
import "../mirrorBallEvent";
import "../plasmaGlobeEvent";
import "../jellyEvent";
import "../shockwaveEvent";
import "../passTheParcelEvent";
import "../gardenHoseEvent";
import "../burningGlassEvent";
import "../stormFrontEvent";
import "../slidePuzzleEvent";
import "../whirlpoolEvent";
import "../satellitesEvent";
import "../typewriterEvent";
import "../railgunEvent";
import "../thunderdomeEvent";
import "../meltEvent";
import "../floodEvent";
import "../piedPiperEvent";
import "../tentaclesEvent";
import "../laserPendulumEvent";
import "../electricEelEvent";
import "../doubleVisionEvent";
import "../honeyEvent";
import "../musicalChairsEvent";
import "../bubbleWandEvent";
import "../hyperspaceEvent";
import "../javelinEvent";
import "../shuffleEvent";
import "../mushroomCloudEvent";
import "../relayEvent";
import "../laserPointerEvent";
import "../stormChaserEvent";
import "../baitBallEvent";
import "../videoWallEvent";
import "../ferrofluidEvent";
import "../hideAndSeekEvent";
import "../magicCarpetEvent";
import "../spirographEvent";
import "../electricNetEvent";
import "../demolitionEvent";
import "../shootingGalleryEvent";
import "../collapseEvent";
import "../volcanoEvent";
import "../skydiversEvent";
import "../speedboatEvent";
import "../peacockEvent";
import "../stormWingsEvent";
import "../clusterBombEvent";
import "../strafingRunEvent";
import "../stainedGlassEvent";
import "../uprisingEvent";
import "../swingRideEvent";
import "../lawnmowerEvent";
import "../lightShowEvent";
import "../bugZapperEvent";
import "../firecrackersEvent";
import "../sixShooterEvent";
import "../thermalEvent";
import "../stalactitesEvent";
import "../kintsugiEvent";
import "../galaxyEvent";
import "../snowdriftEvent";
import "../snowballEvent";
import "../cartwheelEvent";
import "../matryoshkaEvent";
import "../salmonRunEvent";
import "../moonTideEvent";
import "../candyFlossEvent";
import "../figureSkaterEvent";
import "../tripwireEvent";
import "../sunriseEvent";
import "../rallyEvent";
import "../ignitionEvent";
import "../tridentEvent";
import "../crawlEvent";
import "../carpetBombingEvent";
import "../timeBombEvent";
import "../bunkerBusterEvent";
import "../grenadeTossEvent";
import "../depthChargesEvent";
import "../firingSquadEvent";
import "../akimboEvent";
import "../flakBarrageEvent";
import "../sniperNestEvent";
import "../rewindEvent";
import "../morseCodeEvent";
import "../stadiumWaveEvent";
import "../knightsTourEvent";
import "../lavaLampEvent";
import "../dominoesEvent";
import "../inkblotEvent";
import "../softServeEvent";
import "../dollarSignEvent";
import "../mobiusEvent";
import "../swissRollEvent";
import "../dodgeballEvent";
import "../congaLineEvent";
import "../spinningTopEvent";
import "../gobblerEvent";
import "../majoretteEvent";
import "../hulaHoopEvent";
import "../calligraphyEvent";
import "../snakeCharmerEvent";
import "../plateSpinnerEvent";
import "../ferrisWheelEvent";
import "../bucketBrigadeEvent";
import "../skyLanternsEvent";
import "../engraverEvent";
import "../xRayEvent";
import "../laserLassoEvent";
import "../hexRingEvent";
import "../portcullisEvent";
import "../keyholeEvent";
import "../defibrillatorEvent";
import "../circuitBoardEvent";
import "../mjolnirEvent";
import "../arcFlashEvent";
import "../fourCornersEvent";
import "../boltWheelEvent";
import "../minefieldEvent";
import "../cannonadeEvent";
import "../stickyBombsEvent";
import "../crossblastEvent";
import "../mortarEvent";
import "../flashbangEvent";
import "../sentryTurretEvent";
import "../shotgunEvent";
import "../bossFightEvent";
import "../gunshipEvent";
import "../bulletTimeEvent";
import "../flechettesEvent";
import "../radarEvent";
import "../bingoEvent";
import "../laneHopperEvent";
import "../simonSaysEvent";
import "../equalizerEvent";
import "../loadingBarEvent";
import "../diceRollEvent";
import "../mandalaEvent";
import "../zenGardenEvent";
import "../accordionEvent";
import "../fizzEvent";
import "../soundwaveEvent";
import "../taffyEvent";
import "../dripPaintingEvent";
import "../mothsEvent";
import "../curlingEvent";
import "../clotheslineEvent";
import "../balloonPopEvent";
import "../spinBottleEvent";
import "../skyWriterEvent";
import "../goldPanEvent";
import "../bulldozerEvent";
import "../koiPondEvent";
import "../pipeOrganEvent";
import "../antTrailEvent";
import "../hotAirBalloonEvent";
import "../lensFlareEvent";
import "../tightropeEvent";
import "../neonSignEvent";
import "../lightCageEvent";
import "../stairwayEvent";
import "../beaconsEvent";
import "../anvilCrawlerEvent";
import "../neuronsEvent";
import "../bottledBoltEvent";
import "../thunderbirdEvent";
import "../sparkGapEvent";
import "../staticShockEvent";
import "../rocketJumpEvent";
import "../torpedoesEvent";
import "../airstrikeEvent";
import "../dambusterEvent";
import "../airburstEvent";
import "../bombPinwheelEvent";
import "../bulletCurtainEvent";
import "../trickShotEvent";
import "../railShooterEvent";
import "../skeetShootEvent";
import "../tripleTapEvent";
import "../tommyGunEvent";
import "../sweeperEvent";
import "../clawMachineEvent";
import "../lotteryEvent";
import "../wordGuessEvent";
import "../memoryMatchEvent";
import "../ticTacToeEvent";
import "../revCounterEvent";
import "../sluiceEvent";
import "../foundryEvent";
import "../jetStreamEvent";
import "../moatEvent";
import "../seepEvent";
import "../meanderEvent";
import "../waltzEvent";
import "../gyroscopeEvent";
import "../dragonflyEvent";
import "../ringTossEvent";
import "../slipstreamEvent";
import "../sheetMusicEvent";
import "../leafBlowerEvent";
import "../loomEvent";
import "../highDiveEvent";
import "../sowerEvent";
import "../courierEvent";
import "../rodeoEvent";
import "../crosshairEvent";
import "../irisEvent";
import "../bankShotEvent";
import "../sunbeamsEvent";
import "../stargateEvent";
import "../catsCradleEvent";
import "../thunderheadEvent";
import "../pitchforkEvent";
import "../jumperCablesEvent";
import "../lashEvent";
import "../sparkPlugEvent";
import "../liveWireEvent";
import "../fuseRaceEvent";
import "../bouncingBettyEvent";
import "../pressureCookerEvent";
import "../hotPotatoEvent";
import "../daisyChainEvent";
import "../shapedChargeEvent";
import "../detcordEvent";
import "../bulletBloomEvent";
import "../highNoonEvent";
import "../hailfireEvent";
import "../dervishEvent";
import "../invadersEvent";
import "../gunKataEvent";
import "../lockbusterEvent";
import "../connectFourEvent";
import "../comboEvent";
import "../skeeBallEvent";
import "../bubbleShooterEvent";
import "../deltaEvent";
import "../hydrantEvent";
import "../cloverleafEvent";
import "../pinstripeEvent";
import "../faucetEvent";
import "../showerheadEvent";
import "../binaryStarEvent";
import "../hopscotchEvent";
import "../tadpolesEvent";
import "../blinkEvent";
import "../bumperCarsEvent";
import "../pigeonsEvent";
import "../squidEvent";
import "../waterPistolEvent";
import "../poiEvent";
import "../bartenderEvent";
import "../poleVaultEvent";
import "../paintRollerEvent";
import "../buzzsawEvent";
import "../lightCyclesEvent";
import "../fiberOpticEvent";
import "../daddyLonglegsEvent";
import "../knighthoodEvent";
import "../cuttingTorchEvent";
import "../stElmosFireEvent";
import "../steppedLeaderEvent";
import "../trolleyEvent";
import "../boltBounceEvent";
import "../stormCrownEvent";
import "../vanDeGraaffEvent";
import "../barrelRollEvent";
import "../bombStackEvent";
import "../romanCandleEvent";
import "../whistlersEvent";
import "../trebuchetEvent";
import "../dropPodsEvent";
import "../bombCarouselEvent";
import "../lastStandEvent";
import "../tinCanEvent";
import "../pointDefenseEvent";
import "../targetPracticeEvent";
import "../flareGunEvent";
import "../rappelEvent";
import "../stackerEvent";
import "../coinPusherEvent";
import "../highStrikerEvent";
import "../noteHighwayEvent";
import "../safecrackerEvent";
import "../gumballMachineEvent";
import "../ninjaEvent";
import "../bungeeEvent";
import "../funnelCakeEvent";
import "../chrysanthemumEvent";
import "../crossroadsEvent";
import "../waterslideEvent";
import "../bannerEvent";
import "../hauntEvent";
import "../mapleSeedsEvent";
import "../donutsEvent";
import "../hamsterWheelEvent";
import "../lunarLanderEvent";
import "../dowsingEvent";
import "../matadorEvent";
import "../flashFloodEvent";
import "../dolphinEvent";
import "../pufferEvent";
import "../hockeyStopEvent";
import "../twirlEvent";
import "../whaleEvent";
import "../lightPaintingEvent";
import "../saberThrowEvent";
import "../laserMazeEvent";
import "../tapeMeasureEvent";
import "../pulsarEvent";
import "../shortCircuitEvent";
import "../conductorEvent";
import "../doubleStrikeEvent";
import "../lightningFenceEvent";
import "../heatLightningEvent";
import "../powderKegsEvent";
import "../bombFountainEvent";
import "../fragOutEvent";
import "../faultLineEvent";
import "../willowShellsEvent";
import "../swarmStrikeEvent";
import "../concentricEvent";
import "../grazeEvent";
import "../hotfootEvent";
import "../dogfightEvent";
import "../bulletRoseEvent";
import "../armorPiercerEvent";
import "../spotterEvent";
import "../pegSolitaireEvent";
import "../marbleDropEvent";
import "../statuesEvent";
import "../flappyWispEvent";
import "../buriedTreasureEvent";
import "../airHockeyEvent";
import "../boltOfCashEvent";
import "../pendulumPourEvent";
import "../popTheCorkEvent";
import "../wallJumpEvent";
import "../superballEvent";
import "../spinDashEvent";
import "../cupidEvent";
import "../storkEvent";
import "../paperPlaneEvent";
import "../spikeEvent";
import "../toasterEvent";
import "../xylophoneEvent";
import "../birthdayCandlesEvent";
import "../dropTowerEvent";
import "../arrowVolleyEvent";
import "../makeAWishEvent";
import "../blunderbussEvent";
import "../genieEvent";
import "../solarFlareEvent";
import "../heatVisionEvent";
import "../printHeadEvent";
import "../auroraEvent";
import "../thunderRingsEvent";
import "../arcWeldEvent";
import "../stormKiteEvent";
import "../volcanicLightningEvent";
import "../sculptorEvent";
import "../grandFinaleEvent";
import "../bombBouquetEvent";
import "../cascadeEvent";
import "../pinballBombEvent";
import "../bombTrainEvent";
import "../breachingChargeEvent";
import "../confettiCannonEvent";
import "../ammoBeltEvent";
import "../gauntletEvent";
import "../turretTowerEvent";
import "../shellCasingsEvent";
import "../dartsEvent";
import "../battleshipEvent";
import "../interceptorsEvent";
import "../landGrabEvent";
import "../duckDuckGooseEvent";
import "../ringerEvent";
import "../hurdlesEvent";
import "../luckyRollEvent";
import "../cashRegisterEvent";
import "../horseRaceEvent";
import "../dunkTankEvent";
import "../halfPipeEvent";
import "../knotEvent";
import "../tickerTapeEvent";
import "../cashBridgeEvent";
import "../skippingStoneEvent";
import "../woodpeckerEvent";
import "../frisbeeEvent";
import "../kangarooEvent";
import "../badmintonEvent";
import "../tumbleweedEvent";
import "../shuttleRunEvent";
import "../echolocationEvent";
import "../lacrosseEvent";
import "../jetSkiEvent";
import "../drinkingStrawEvent";
import "../seaSerpentEvent";
import "../magicTrickEvent";
import "../fountainPenEvent";
import "../spoolEvent";
import "../laserRainEvent";
import "../crossCutEvent";
import "../heliographEvent";
import "../starburstEvent";
import "../thunderDrumEvent";
import "../boltBarrageEvent";
import "../coilgunEvent";
import "../snowflakeEvent";
import "../bombSnakeEvent";
import "../spiderMinesEvent";
import "../crossetteEvent";
import "../spiralChargeEvent";
import "../bombBubblesEvent";
import "../rocketSledEvent";
import "../dynamiteFishingEvent";
import "../chargeShotEvent";
import "../corkscrewRoundsEvent";
import "../orbitalGunsEvent";
import "../tracerRoundsEvent";
import "../pelletStormEvent";
import "../bulletSnakeEvent";
import "../rockPaperScissorsEvent";
import "../limboEvent";
import "../quizShowEvent";
import "../sumoEvent";
import "../paperTossEvent";
import "../armWrestlingEvent";
import "../keepyUppyEvent";
import "../pinTheTailEvent";
import "../trustFallEvent";
import "../bubbleGumEvent";
import "../canalLocksEvent";
import "../bobsledEvent";
import "../springLoadedEvent";
import "../influxEvent";
import "../unevenBarsEvent";
import "../bumblebeeEvent";
import "../shotPutEvent";
import "../humanCannonballEvent";
import "../foxAndHoundsEvent";
import "../kingfisherEvent";
import "../joustEvent";
import "../pelicanEvent";
import "../dragsterEvent";
import "../fireBreatherEvent";
import "../bucketSwingEvent";
import "../puppeteerEvent";
import "../coronaEvent";
import "../pillarsEvent";
import "../laserLadderEvent";
import "../beamSplitterEvent";
import "../teleporterEvent";
import "../ringLightEvent";
import "../taserEvent";
import "../arcFurnaceEvent";
import "../fiveFingersEvent";
import "../cattleProdEvent";
import "../boltSlingEvent";
import "../collidingStormsEvent";
import "../bombJugglerEvent";
import "../bombSquadEvent";
import "../splitterEvent";
import "../bombPendulumEvent";
import "../paradropEvent";
import "../bombPachinkoEvent";
import "../fuseClockEvent";
import "../hedgehogEvent";
import "../splitShotEvent";
import "../bulletLassoEvent";
import "../bulletWeaveEvent";
import "../bulletFountainEvent";
import "../coveringFireEvent";
import "../checkersEvent";
import "../minesweeperEvent";
import "../jackInTheBoxEvent";
import "../spillwayEvent";
import "../crosscurrentsEvent";
import "../oxbowEvent";
import "../breakersEvent";
import "../rivuletsEvent";
import "../torrentEvent";
import "../lissajousEvent";
import "../moonHopEvent";
import "../peekabooEvent";
import "../tiltAWhirlEvent";
import "../waterStriderEvent";
import "../ropeClimbEvent";
import "../paddleSteamerEvent";
import "../jetWashEvent";
import "../bellowsEvent";
import "../rainDanceEvent";
import "../skiTowEvent";
import "../ribbonDancerEvent";
import "../laserTurnstileEvent";
import "../lightBridgeEvent";
import "../laserWebEvent";
import "../footlightsEvent";
import "../fusionBeamEvent";
import "../pinpointEvent";
import "../galvanizeEvent";
import "../sparkJumpEvent";
import "../staticClingEvent";
import "../capacitorEvent";
import "../sparkTrainEvent";
import "../arcBridgeEvent";
import "../daisyCutterEvent";
import "../rippleMinesEvent";
import "../bombYoYoEvent";
import "../bombHailEvent";
import "../groundPoundEvent";
import "../cherryBombEvent";
import "../bombCrownEvent";
import "../bulletCombEvent";
import "../bulletBraidEvent";
import "../bulletCageEvent";
import "../gunslingerEvent";
import "../bulletWheelEvent";
import "../bulletLadderEvent";
import "../whipZoomEvent";
import "../irisOutEvent";
import "../screenReelsEvent";
import "../goldLeafEvent";
import "../pixelStormEvent";
import "../gravityFlipEvent";
import "../echoEvent";
import "../mirrorBoxEvent";
import "../pullBackEvent";
import "../treadmillEvent";
import "../blastOffEvent";
import "../popUpEvent";
import "../stickerPeelEvent";
import "../glissandoEvent";
import "../vaultDoorsEvent";
import "../champagneTowerEvent";
import "../pinballRiverEvent";
import "../pressureWasherEvent";
import "../irrigationEvent";
import "../waterspoutEvent";
import "../sidewinderEvent";
import "../orbitSwapEvent";
import "../cuckooEvent";
import "../gyreEvent";
import "../barHopEvent";
import "../cometPlowEvent";
import "../hoseReelEvent";
import "../geyserRiderEvent";
import "../bubbleBlowerEvent";
import "../poolDiveEvent";
import "../rubberBandEvent";
import "../beamViseEvent";
import "../laserRakeEvent";
import "../lightDominoesEvent";
import "../pryBarEvent";
import "../teslaTennisEvent";
import "../tuningForkEvent";
import "../boltSpiralEvent";
import "../groundCurrentEvent";
import "../overchargeEvent";
import "../bombTornadoEvent";
import "../bombBoomerangEvent";
import "../multistageEvent";
import "../bombPileEvent";
import "../bombGarlandEvent";
import "../homingRoundsEvent";
import "../waveCannonEvent";
import "../snapbackEvent";
import "../bulletFunnelEvent";
import "../crisscrossEvent";
import "../chainFountainEvent";
import "../smokeRingsEvent";
import "../waterSaluteEvent";
import "../doublePendulumEvent";
import "../trapezeEvent";
import "../diaboloEvent";
import "../zorbEvent";
import "../hoopDiveEvent";
import "../spinArtEvent";
import "../paperCutterEvent";
import "../flippersEvent";
import "../drawbridgeEvent";
import "../flailEvent";
import "../vineSwingEvent";
import "../bombSnowballEvent";
import "../gerbEvent";
import "../recoilEvent";
import "../tumbleFireEvent";
import "../rollUpEvent";
import "../shredderEvent";
import "../headOnEvent";
import "../pyramidEvent";
import "../pizzaTossEvent";
import "../compassEvent";
import "../skewerEvent";
import "../bombCometEvent";
import "../kaboomEvent";
import "../returnFireEvent";
import "../frostedGlassEvent";
import "../switchOffEvent";
import "../stuntTrackEvent";
import "../fleasEvent";
import "../handPumpEvent";
import "../pickUpSticksEvent";
import "../thunderShellEvent";
import "../midAirEvent";
import "../chainFireEvent";
import "../rimShotEvent";
import "../tinRoofEvent";
import "../crumpleEvent";
import "../minimizeEvent";
import "../jumpingJetsEvent";
import "../bubbleChamberEvent";
import "../castNetEvent";
import "../hobermanEvent";
import "../excaliburEvent";
import "../pistonsEvent";
import "../williamTellEvent";
import "../foosballEvent";
import "../rubberSheetEvent";
import "../rattleEvent";
import "../eddiesEvent";
import "../tubeManEvent";
import "../deflateEvent";
import "../gearTrainEvent";
import "../upstrikeEvent";
import "../creepingBarrageEvent";
import "../ballisticPendulumEvent";
import "../ringTawEvent";
import "../rainyWindowEvent";
import "../inflateEvent";
import "../domeFountainsEvent";
import "../bellRingersEvent";
import "../wetDogEvent";
import "../towerCraneEvent";
import "../beadLightningEvent";
import "../rockslideEvent";
import "../tightGroupEvent";
import "../jacksEvent";
import "../reflectingPoolEvent";
import "../pinArtEvent";
import "../twinWhirlpoolsEvent";
import "../hatchlingsEvent";
import "../butterfingersEvent";
import "../lockPickEvent";
import "../blacksmithEvent";
import "../seismicChargesEvent";
import "../skipShotsEvent";
import "../jumpingBeansEvent";
import "../swissCheeseEvent";
import "../explodedViewEvent";
import "../riptideEvent";
import "../fencingEvent";
import "../waterTowerEvent";
import "../barberPoleEvent";
import "../ionCannonEvent";
import "../claymoreEvent";
import "../pepperboxEvent";
import "../squashEvent";
import "../verticalHoldEvent";
import "../halftoneEvent";
import "../blowholeEvent";
import "../lamplighterEvent";
import "../fireBrigadeEvent";
import "../spokesEvent";
import "../thunderRingEvent";
import "../bottleRocketEvent";
import "../skeetEvent";
import "../tennisEvent";
import "../interlaceEvent";
import "../mirrorMirrorEvent";
import "../cottonCandyEvent";
import "../pelotonEvent";
import "../drinkingBirdEvent";
import "../laserDrillEvent";
import "../hairRaiserEvent";
import "../detonatorEvent";
import "../bulletRainEvent";
import "../bouncyCastleEvent";
import "../gameOfLifeEvent";
import "../labyrinthEvent";
import "../tidalBoreEvent";
import "../scrumEvent";
import "../goldRushEvent";
import "../suspensionBridgeEvent";
import "../redlineEvent";
import "../willowEvent";
import "../quickdrawEvent";
import "../galileanCannonEvent";
import "../chaosGameEvent";
import "../sandpileEvent";
import "../augerEvent";
import "../fountainShowEvent";
import "../spinningPlatesEvent";
import "../scoopsEvent";
import "../solarFurnaceEvent";
import "../lightningHandsEvent";
import "../ringOfFireEvent";
import "../bulletClashEvent";
import "../bouncePassEvent";
import "../oilStrikeEvent";
import "../harmonographEvent";
import "../quicksortEvent";
import "../capillaryEvent";
import "../battleTopsEvent";
import "../pneumaticTubesEvent";
import "../starPolygonEvent";
import "../voltSpiderEvent";
import "../orbitalDecayEvent";
import "../sprayAndPrayEvent";
import "../shuttleEvent";
import "../drillDuelEvent";
import "../rule30Event";
import "../airbrushEvent";
import "../calvingEvent";
import "../phoenixEvent";
import "../steamTrainEvent";
import "../lightSailEvent";
import "../inchwormEvent";
import "../criticalMassEvent";
import "../knifeThrowerEvent";
import "../compactorEvent";
import "../coreSampleEvent";
import "../foamPartyEvent";
import "../langtonsAntEvent";
import "../othelloEvent";
import "../gloopEvent";
import "../escapeVelocityEvent";
import "../sungrazerEvent";
import "../fractalTreeEvent";
import "../switchboardEvent";
import "../interferenceEvent";
import "../towerDefenseEvent";
import "../bounceWaveEvent";
import "../moleEvent";
import "../carWashEvent";
import "../dragonCurveEvent";
import "../lightsOutEvent";
import "../tumblerEvent";
import "../waggleDanceEvent";
import "../waterCycleEvent";
import "../foldingRuleEvent";
import "../arcSwarmEvent";
import "../lockstepEvent";
import "../hackySackEvent";
import "../woodwormEvent";
import "../graffitiEvent";
import "../voronoiEvent";
import "../percolationEvent";
import "../duneEvent";
import "../stringOfPearlsEvent";
import "../riverJugglerEvent";
import "../likeChargesEvent";
import "../collisionCourseEvent";
import "../targetWheelEvent";
import "../spinningHexagonEvent";
import "../beadDrillEvent";
import "../hydroseederEvent";
import "../mancalaEvent";
import "../breakthroughEvent";
import "../curvesEvent";
import "../archimedesScrewEvent";
import "../murmurationEvent";
import "../spiritBombEvent";
import "../metronomeEvent";
import "../powerGridEvent";
import "../bombBowlingEvent";
import "../showdownEvent";
import "../jumpRopeEvent";
import "../strongboxEvent";
import "../snowCannonEvent";
import "../hillClimbEvent";
import "../abacusEvent";
import "../coralEvent";
import "../chladniEvent";
import "../afterimageEvent";
import "../snowGlobeEvent";
import "../sundialEvent";
import "../riveterEvent";
import "../paddleBallEvent";
import "../geodeEvent";
import "../fogMachineEvent";
import "../chicaneEvent";
import "../epicyclesEvent";
import "../sieveEvent";
import "../clutterEvent";
import "../partingEvent";
import "../buzzWireEvent";
import "../hiccupsEvent";
import "../cutTheRopeEvent";
import "../whisperingGalleryEvent";
import "../chunnelEvent";
import "../sneezeEvent";
import "../grandPrixEvent";
import "../pillowFightEvent";
import "../dotsAndBoxesEvent";
import "../holdingPatternEvent";
import "../tankerEvent";
import "../vaporCloudEvent";
import "../shieldBreakerEvent";
import "../bottleneckEvent";
import "../skylightEvent";
import "../delugeEvent";
import "../monacoEvent";
import "../glitterSpillEvent";
import "../rogueWaveEvent";
import "../thunderEggEvent";
import "../hologramEvent";
import "../leafFallEvent";
import "../threeBodyEvent";
import "../billowsEvent";
import "../moireEvent";
import "../polePositionEvent";
import "../countersinkEvent";
import "../busyBeaverEvent";
import "../pursuitEvent";
import "../fractalChargeEvent";
import "../snowplowEvent";
import "../franklinsKiteEvent";
import "../sokobanEvent";
import "../frackingEvent";
import "../chopperEvent";
import "../extinguisherEvent";
import "../goldenSpiralEvent";
import "../wildfireEvent";
import "../timeTrialEvent";
import "../dustBunniesEvent";
import "../magneticPendulumEvent";
import "../deCasteljauEvent";
import "../buffonsNeedleEvent";
import "../fuseMazeEvent";
import "../barBilliardsEvent";
import "../levyFlightEvent";
import "../brachistochroneEvent";
import "../ulamSpiralEvent";
import "../seedPodsEvent";
import "../rippleFireEvent";
import "../sparkChamberEvent";
import "../turbineEvent";
import "../strangeAttractorEvent";
import "../topsyTurvyEvent";
import "../goldPlatingEvent";
import "../crosswindEvent";
import "../hailstoneEvent";
import "../hilbertCurveEvent";
import "../leMansEvent";
import "../tunnelBorerEvent";
import "../harpoonEvent";
import "../eightQueensEvent";
import "../shortestPathEvent";
import "../sinkholeEvent";
import "../backwashEvent";
import "../deflectorEvent";
import "../sunflowerEvent";
import "../convexHullEvent";
import "../slashEvent";
import "../jackhammerEvent";
import "../pummelEvent";
import "../overloadEvent";
import "../gatlingEvent";
import "../pressEvent";
import "../drillEvent";
import "../burrowEvent";
import "../pingPongEvent";
import "../slamDunkEvent";
import "../uppercutEvent";
import "../headHopEvent";
import "../paparazziEvent";
import "../missileBarrageEvent";
import "../sonicBoomEvent";
import "../mitosisEvent";
import "../plinkoEvent";
import "../hammerThrowEvent";
import "../snakeEvent";
import "../breakoutEvent";
import "../lineClearEvent";
import "../breakShotEvent";
import "../bulletHellEvent";
import "../vortexEvent";
import "../ricochetEvent";
import "../waterfallEvent";
import "../conveyorEvent";
import "../firefliesEvent";
import "../streamEvent";
import "../trailsEvent";
import "../drawEvent";
import "../nightSkyEvent";
import "../pitcherEvent";
import "../glimmerEvent";
import "../renovateEvent";
import "../upgradeEvent";
import "../unlockEvent";
import {
  armTakenEventProc,
  getClaimedEventCover,
  takeClaimedEventProc,
  type EventProcContext,
  type ScreenAreaLocal,
} from "../eventProcs";
import {
  isScreenFrozen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import {
  increaseIncomeRate,
  increaseIncomeRateBy,
  UPGRADE_MILESTONE_STEP,
  hitTestIncomeBar,
  triggerIncomeBarPress,
  currentPayoutAmount,
  rewardPayoutAmount,
  currentIncomeRatePerSecond,
  getIncomeBarCenter,
  queueOvertimeTickDelivery,
  deliverOvertimeTicks,
  clearOvertimeTickDelivery,
} from "../incomePanel";
import {
  spendTotalIncome,
  addTotalIncome,
  getTotalIncome,
  getCompanyIncomeRatePerSecond,
  getAllCompaniesIncomeRatePerSecond,
  getAllCompaniesTotalIncome,
  getAllCompaniesUpgradesValue,
  getActiveCompanyInvestedValue,
} from "../../totalIncome";
import { getActiveCompanyIndex } from "../../company";
import {
  spawnCoinBurst as animateCoinBurst,
  spawnHomingCoinBurst as animateHomingCoinBurst,
} from "../coins";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import { applyBonusTierIncome } from "../../shared/bonusTierReward";
import {
  announceEventStartClick,
  EVENT_COIN_TIMING,
} from "../../shared/floorEvents";
import { triggerLevelPop } from "../star";
import { hitTestUpgradeArrow } from "../upgradeArrow";
import { computeBaseFloorStats } from "..";
import {
  type CritProcKind,
  type CritRollResult,
  readCritProcs,
  applyCritProcs,
  onlyCritProc,
  tierOnlyCrit,
  pickHigherCritTier,
  recordCritProcLanded,
  triggerPriceMatchCrit,
  LUCKY_NUMBER_MIN_FLOORS,
  LUCKY_NUMBER_MAX_FLOORS,
} from "../../shared/critTypes";
import {
  playSold as soundSold,
  playBloop as soundBloop,
  playCoinDrop as soundCoinDrop,
} from "../../sound";
import {
  hitTestFloorLock,
  unlockFloor,
  startFloorUnlockAnim,
  unlockAllFloors,
  ensureLockedFloorAbove,
  getLockCenter,
  MAX_FLOORS_PER_BUILDING,
  UNLOCK_OVERLAY_MS,
} from "../floorLock";
import {
  activateBoosted,
  BOOST_DURATION_MS,
  isFloorMaxed,
  type Floor,
} from "../../gameState";
import {
  type BigNumber,
  ZERO,
  add,
  gt,
  lt,
  multiply,
  subtract,
} from "../../shared/bigNumber";
import { triggerCritCelebration } from "./critCelebration";

const spawnCoinBurst = liveEffect(animateCoinBurst);
const spawnHomingCoinBurst = liveEffect(animateHomingCoinBurst);
// each landing coin hands the bar its share of the ticks, so the readout climbs
// in step with the coins instead of jumping on the click
const spawnOvertimeCoins = liveEffect(
  (
    floor: Floor,
    x: number,
    y: number,
    isGroundFloor: boolean,
    ticks: number,
  ) => {
    queueOvertimeTickDelivery(floor, ticks);
    let remaining = ticks;
    let coinsLeft = 0;
    coinsLeft = animateHomingCoinBurst(floor, x, y, {
      target: getIncomeBarCenter(isGroundFloor),
      ...EVENT_COIN_TIMING,
      onEachArrive: () => {
        const share = coinsLeft > 1 ? remaining / coinsLeft : remaining;
        remaining -= share;
        coinsLeft -= 1;
        deliverOvertimeTicks(floor, share);
      },
    });
  },
);
const triggerButtonPress = liveEffect(animateButtonPress);
const triggerJumpAll = liveEffect(animateJumpAll);
const playSold = liveEffect(soundSold);
const playBloop = liveEffect(soundBloop);
const playCoinDrop = liveEffect(soundCoinDrop);

// "peppermint crit" (see shared/critTypes' isPeppermintCrit): promotes every
// OTHER unlocked floor in the building one tier step at once (same
// nextCritTier promotion upgrade crit uses on a single floor, just applied
// building-wide to alternating floors) — unlocked floors always form a
// contiguous prefix of `floors`, so striding by 2 over the whole array and
// skipping any not-yet-unlocked entries is equivalent to "every other of all
// unlocked floors"
function applyPeppermintCrit(floors: Floor[]): void {
  for (let i = 0; i < floors.length; i += 2) {
    const floor = floors[i];
    if (floor.unlocked) {
      floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
    }
  }
}

// "Executive Order" crit (see shared/critTypes's isExecutiveOrderCrit): the
// same tier promotion, but on EVERY unlocked floor instead of every other one
function applyExecutiveOrderCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
  }
}

// "Round Up" crit (see shared/critTypes's isRoundUpCrit): hands every
// unlocked floor however many free upgrades it takes to reach its NEXT whole
// multiple of ROUND_UP_CRIT_STEP — a floor already sitting exactly on one
// (a freshly unlocked floor is at 0) gets a full step rather than nothing
function applyRoundUpCrit(floors: Floor[]): void {
  for (const [index, floor] of floors.entries()) {
    if (!floor.unlocked) continue;
    const ticks =
      ROUND_UP_CRIT_STEP - (floor.upgradeCount % ROUND_UP_CRIT_STEP);
    for (let i = 0; i < ticks; i++) applyUpgradeTick(floor, index === 0);
  }
}

function applySafetyNetCrit(floors: Floor[]): void {
  let target: Floor | null = null;
  for (const floor of floors) {
    if (
      !floor.unlocked ||
      (target && !gt(floor.upgradeCost, target.upgradeCost))
    ) {
      continue;
    }
    target = floor;
  }
  if (!target) return;
  const targetIndex = floors.indexOf(target);
  for (let i = 0; i < SAFETY_NET_CRIT_UPGRADES; i++) {
    applyUpgradeTick(target, targetIndex === 0);
  }
}

function applyFloorShareCrit(
  floors: Floor[],
  target: Floor,
  levelMultiplier = 1,
): void {
  const targetIndex = floors.indexOf(target);
  if (targetIndex < 0 || !target.unlocked) return;

  let sharedLevel = target.upgradeCount;
  for (let index = 0; index < targetIndex; index++) {
    const floor = floors[index];
    if (floor.unlocked) sharedLevel += floor.upgradeCount;
  }

  const rateMultiplier = target.critMultiplierTier
    ? CRIT_TIER_CONFIG[target.critMultiplierTier].multiplier
    : 1;
  target.incomeAmount = add(
    target.incomeAmount,
    multiply(target.rateStep, sharedLevel * levelMultiplier * rateMultiplier),
  );
}

// "Casual Friday"/"Fancy Friday" crits (see shared/critTypes's
// isCasualFridayCrit/isFancyFridayCrit): a flat batch of free upgrades on
// every unlocked floor, not scaled by the landed tier — the two differ only
// in how big the batch is
function applyFlatUpgradeBatch(floors: Floor[], count: number): void {
  for (const [index, floor] of floors.entries()) {
    if (!floor.unlocked) continue;
    for (let i = 0; i < count; i++) applyUpgradeTick(floor, index === 0);
  }
}

// "heavenly crit" (see shared/critTypes' isHeavenlyCrit): the single biggest
// reward in the game — unlocks every remaining floor in the building for
// free (reusing the exact same unlockAllFloors loop a paid "unlock all"
// purchase uses), promotes EVERY floor (including the ones just unlocked)
// straight to the strongest tier (CRIT_TIER_ORDER[0], rarest-first so index 0
// is always the top), then grants that tier's own free-upgrade count to every
// floor once — the same reward shape a real crit of that tier landing on a
// floor already grants, just applied building-wide instead of to one floor
function applyHeavenlyCrit(deps: FloorActionsDeps): void {
  unlockAllFloors({
    floors: deps.floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
  const maxTier = CRIT_TIER_ORDER[0];
  const count = CRIT_TIER_CONFIG[maxTier].multiplier;
  deps.floors.forEach((floor) => {
    floor.critMultiplierTier = maxTier;
    // cheap direct rate bump instead of replaying the full applyUpgradeTick
    // (coin burst + milestone check) up to `count` times per floor — with up
    // to ~20 floors this would otherwise be thousands of bursts/rerolls for
    // one proc
    increaseIncomeRateBy(floor, count);
    critNow(deps, floor);
  });
}

// "pair"/"three of a kind"/"four of a kind"/"full house" crits (see
// shared/critTypes's isPairCrit etc.): promotes `count` floors' own
// permanent crit tier one step, starting AT the floor that actually landed
// the proc and walking upward \u2014 same auto-unlock-as-it-goes behavior
// applyChainCrit's walk uses (a locked floor in the path is unlocked for
// free instead of blocking the walk), just a fixed count instead of a
// probabilistic continue-chance. `count` always comes from shared/critTypes'
// POKER_HAND_CRIT_COUNTS \u2014 the one place that number is ever named
function applyPokerHandCrit(
  deps: ChainCritDeps,
  startIndex: number,
  count: number,
): void {
  const { floors, backgroundCount, multiplier, onFloorAdded } = deps;
  for (
    let promoted = 0, index = startIndex;
    promoted < count && index < floors.length;
    promoted++, index++
  ) {
    const target = floors[index];
    if (!target.unlocked) {
      unlockFloor(target);
      ensureLockedFloorAbove({
        floors,
        backgroundCount,
        multiplier,
        onAdd: onFloorAdded,
      });
    }
    target.critMultiplierTier = nextCritTier(target.critMultiplierTier);
  }
}

export interface FloorActionsDeps {
  floors: Floor[];
  backgroundCount: number;
  multiplier: BigNumber; // this building's economy scale (buildings/index.ts)
  persist: () => void;
  // gameCanvas.ts's own continuous per-frame redraw already picks up any state change
  // on the next tick, so these just need to register the new floor for hit-testing/
  // scroll bookkeeping — no manual "redraw this one floor now" plumbing needed anymore
  onFloorAdded: (floor: Floor) => void;
  createMysticBuilding: () => void;
  getCompanyValue: () => BigNumber;
  applyCompanyWideBoost: () => void;
  // converts the current visual screen center (where screenShake's "CRIT!" flash is
  // drawn) into this floor's own local coordinate space, so a coin burst can be
  // anchored there instead of at a fixed floor-local point
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number };
  getScreenAreaLocal?: ScreenAreaLocal;
  // floors currently in view, for the "Boost" event's target pick (see
  // floors/boostEvent) — omitted off-screen (e.g. map/draft purchases), where
  // that event simply never starts
  getOnScreenFloors?: OnScreenFloors;
  // world-space rect of any floor (see floors/swarmEvent's neighbour targets)
  getFloorRect?: FloorRectResolver;
}

// re-exported for floors/index.ts's facade — the canonical check now lives in
// upgradeButton.ts (needs it internally for its own hold-animation deflate),
// this file just reuses it for hitTestFloorHover below
export { isUpgradeButtonEnabled };

// whether a floor-local point lands on anything hoverable (cursor should be "pointer")
export function hitTestFloorHover(
  x: number,
  y: number,
  floor: Floor,
  isGroundFloor: boolean,
): boolean {
  return (
    (hitTestUpgradeButton(x, y, isGroundFloor) &&
      floor.unlocked &&
      isUpgradeButtonEnabled(floor)) ||
    (canCancelOvertime(floor, Date.now()) &&
      hitTestIncomeBar(x, y, isGroundFloor)) ||
    hitTestFloorLock(x, y, floor) ||
    hitTestUpgradeArrow(x, y, floor) ||
    hitTestWorkers(x, y, floor).length > 0
  );
}

// one upgrade tick's worth of logic — rate increase, the small jittered coin
// burst at the button, and the every-10th-upgrade milestone burst (same one
// that halves the floor's income interval, see incomePanel.ts). Shared by a
// normal paid click and the crit branch below, which runs this exactly
// CRIT_UPGRADE_COUNT times back to back (minus the cost) — calling this once
// per simulated click, not just once total, is what makes a crit landing on a
// multiple of 10 mid-run behave identically to 5 real clicks would.
// Deliberately does NOT reroll the next crit itself — a landed tier's own
// multiplier (e.g. x125) would otherwise reroll the special-crit gateway once
// per free tick instead of once for the whole crit; only the player's own
// upgrade-button click rolls the next crit, once, after this has run its full count
// burst: only a bought upgrade bursts coins; crit rewards stay coinless
function applyUpgradeTick(
  floor: Floor,
  isGroundFloor: boolean,
  burst = false,
): void {
  increaseIncomeRate(floor);
  if (isDetachedJobRunning()) return;
  // every 10th upgrade (the milestone that halves the income interval) the
  // level label pops
  if (floor.upgradeCount % UPGRADE_MILESTONE_STEP === 0) {
    triggerLevelPop(floor);
    playBloop();
  }
  if (!burst) return;
  const center = getButtonCenter(isGroundFloor);
  // small random jitter so the burst doesn't spawn at the exact same pixel
  // every single click — a random point spanning the button's own inner width
  // on X (scaled back 25%) and half its height on Y
  const jitterX = (Math.random() - 0.5) * (BTN_W * 0.75);
  const jitterY = (Math.random() - 0.5) * (BTN_H / 2);
  spawnCoinBurst(floor, center.x + jitterX, center.y + jitterY, () => {});
}

// State-only version of the normal upgrade-button click used by automated
// buyers. It consumes an already armed crit before paying for a normal upgrade,
// exactly like the manual click path, so automated purchases cannot overwrite
// a crit without applying its reward. Each automated upgrade rolls the next
// crit, which the following automated upgrade consumes, so only a crit rolled
// on a floor's last automated upgrade is left armed.
export function performAutomatedUpgradeClick(
  deps: FloorActionsDeps,
  floor: Floor,
  isGroundFloor: boolean,
): boolean {
  if (!floor.unlocked || isFloorLocked(floor) || isFloorMaxed(floor))
    return false;
  if (isCritUpgrade(floor)) {
    return performAutomatedUpgradeAfterPayment(
      deps,
      floor,
      isGroundFloor,
      false,
    );
  }
  if (!spendTotalIncome(getUpgradeCost(floor))) return false;
  return performAutomatedUpgradeAfterPayment(deps, floor, isGroundFloor, true);
}

export function performAutomatedUpgradeAfterPayment(
  deps: FloorActionsDeps,
  floor: Floor,
  isGroundFloor: boolean,
  paid: boolean,
): boolean {
  if (!floor.unlocked) return false;
  if (isCritUpgrade(floor)) {
    const tier = getCritTier(floor)!;
    consumeCritUpgrade(floor);
    rollCritUpgrade(floor, false);
    applyFloorCrit(deps, floor, tierOnlyCrit(tier), false);
    deps.persist();
    return true;
  }
  if (!paid && !spendTotalIncome(getUpgradeCost(floor))) return false;
  applyUpgradeTick(floor, isGroundFloor, true);
  rollCritUpgrade(floor, false);
  deps.persist();
  return true;
}

// State-only version of a manual floor-unlock click. Floor purchases use their
// dedicated one-shot crit roll rather than the next-upgrade telegraph.
export function performAutomatedFloorUnlock(
  deps: FloorActionsDeps,
  floor: Floor,
  prepaid = false,
): boolean {
  if (
    floor.unlocked ||
    isFloorLocked(floor) ||
    (!prepaid && !spendTotalIncome(floor.unlockCost))
  )
    return false;
  unlockFloor(floor);
  ensureLockedFloorAbove({
    floors: deps.floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
  const buyTier = rollFloorBuyCrit(false);
  if (buyTier) {
    floor.critMultiplierTier = pickHigherCritTier(
      floor.critMultiplierTier,
      buyTier.tier,
    );
    applyFloorCrit(deps, floor, buyTier, false);
    critNow(deps, floor, false);
  }
  deps.persist();
  return true;
}

// "boost crit" reward (see upgradeButton.ts's isBoostCrit): the SAME building-
// wide free-boost-everyone reward + cat-jump celebration hud/boostMenu.ts's
// buyBoostAll and mouse/index.ts's free click trigger already use — never a
// separate single-floor copy of that loop. durationMs (default the normal
// boost length) lets the Sunshine crit below grant a longer-lasting boost
// through this exact same reward function
function applyFloorBoost(floors: Floor[], durationMs?: number): void {
  applyBoostAll(floors, durationMs);
  triggerJumpAll(floors, Date.now());
}

// "sunshine crit" (see shared/critTypes' isSunshineCrit): identical reward to
// boost above, just twice the normal boost duration
const SUNSHINE_BOOST_DURATION_MS = BOOST_DURATION_MS * 2;
function applySunshineCrit(floors: Floor[]): void {
  applyFloorBoost(floors, SUNSHINE_BOOST_DURATION_MS);
}

// "snowday crit" (see shared/critTypes' isSnowdayCrit): identical reward to
// sunshine above, just three times the normal boost duration
const SNOWDAY_BOOST_DURATION_MS = BOOST_DURATION_MS * 3;
function applySnowdayCrit(floors: Floor[]): void {
  applyFloorBoost(floors, SNOWDAY_BOOST_DURATION_MS);
}

// "Coffee Run" crit (see shared/critTypes' isCoffeeRunCrit): the same reward
// again, at the family's longest duration — a full minute
const COFFEE_RUN_BOOST_DURATION_MS = BOOST_DURATION_MS * 4;
function applyCoffeeRunCrit(floors: Floor[]): void {
  applyFloorBoost(floors, COFFEE_RUN_BOOST_DURATION_MS);
}

function applyDressCodeCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    if (!floor.hasManager) {
      floor.hasManager = true;
    } else {
      applyInternCrit(floor);
    }
  }
}

// "Recruitment Drive" crit: fill the floor that crit and then each contiguous
// unlocked floor above it, stopping before the first maxed or locked floor.
function applyRecruitmentDriveCrit(floors: Floor[], floor: Floor): void {
  let index = floors.indexOf(floor);
  if (index < 0 || !floor.unlocked) return;
  if (floor.workerCount < MAX_RENDERED_WORKERS) {
    floor.workerCount = MAX_RENDERED_WORKERS;
  }
  index += 1;
  while (index < floors.length) {
    const target = floors[index];
    if (!target.unlocked || target.workerCount >= MAX_RENDERED_WORKERS) return;
    target.workerCount = MAX_RENDERED_WORKERS;
    index += 1;
  }
}

// "Merger" crit: replay free upgrade ticks on every unlocked floor below the
// landing floor until each reaches the landing floor's level. Floor order is
// ground-to-top, so lower floors are the preceding array entries.
function applyMergerCrit(floors: Floor[], floor: Floor): void {
  const landingIndex = floors.indexOf(floor);
  const targetLevel = floor.upgradeCount;
  for (let index = landingIndex - 1; index >= 0; index--) {
    const lowerFloor = floors[index];
    if (!lowerFloor.unlocked) continue;
    while (lowerFloor.upgradeCount < targetLevel) {
      applyUpgradeTick(lowerFloor, index === 0);
    }
  }
}

// "night shift crit" (see shared/critTypes' isNightShiftCrit): same
// building-wide free-boost reward as boost/sunshine/snowday above, but its
// own SHORTER duration — half the normal boost length. Also, for the same
// shorter window, activates `extraWorkers` "virtual" boosted worker slots
// just past each unlocked floor's own last rendered worker index:
// countBoostedWorkers (gameState.ts) counts every slot regardless of
// rendered-worker cap, so this bumps incomePanel.ts's boost-speed exponent by
// extraWorkers/MAX_RENDERED_WORKERS — the same effect that many genuine extra
// boosted workers would have — while getRenderedWorkerCount-bounded drawing
// never renders them, since real workers only ever occupy indices below that
// count. "Night Owl" below is the same reward with two virtual workers
// instead of one
const NIGHT_SHIFT_BOOST_DURATION_MS = Math.round(BOOST_DURATION_MS / 2);
function applyNightShiftBoost(floors: Floor[], extraWorkers: number): void {
  applyFloorBoost(floors, NIGHT_SHIFT_BOOST_DURATION_MS);
  const now = Date.now();
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    const firstVirtualIndex = getRenderedWorkerCount(floor);
    for (let i = 0; i < extraWorkers; i++) {
      activateBoosted(
        floor,
        firstVirtualIndex + i,
        now,
        NIGHT_SHIFT_BOOST_DURATION_MS,
      );
    }
  }
}

function applyNightShiftCrit(floors: Floor[]): void {
  applyNightShiftBoost(floors, 1);
}

// "Night Owl" crit (see shared/critTypes' isNightOwlCrit): Night Shift with
// twice the virtual-worker bump
function applyNightOwlCrit(floors: Floor[]): void {
  applyNightShiftBoost(floors, 2);
}

// "Headhunter" crit (see shared/critTypes's isHeadhunterCrit): poaches the
// building's best headcount onto just the floor that crit — Reinforcements'
// levelling-up, narrowed to one floor. Nothing happens when that floor is
// already the best-staffed one (or the only one)
function applyHeadhunterCrit(floor: Floor, floors: Floor[]): void {
  let best = 0;
  for (const other of floors) {
    if (other.unlocked) best = Math.max(best, other.workerCount);
  }
  floor.workerCount = Math.max(
    floor.workerCount,
    Math.min(best, MAX_RENDERED_WORKERS),
  );
}

// "bull market crit" (see shared/critTypes's isBullMarketCrit): doubles every
// unlocked floor's own upgradeCount building-wide. Uses increaseIncomeRate
// directly rather than applyUpgradeTick for the same reason applyHeavenlyCrit
// does — a well-upgraded building would otherwise spawn thousands of bursts
function applyBullMarketCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    increaseIncomeRateBy(floor, floor.upgradeCount);
  }
}

// "Domino Effect" starts with one free upgrade on the landing floor, then
// has a 50% chance to reach each floor above it with double the prior batch.
// Batch upgrades use the cheap rate-only path so a late-building domino run
// cannot freeze the main thread by spawning one particle per simulated click.
function applyDominoEffectCrit(
  deps: FloorActionsDeps,
  startIndex: number,
): void {
  const { floors, backgroundCount, multiplier, onFloorAdded } = deps;
  let index = startIndex;
  let count = 1;
  while (index < floors.length) {
    const target = floors[index];
    if (!target.unlocked) {
      unlockFloor(target);
      ensureLockedFloorAbove({
        floors,
        backgroundCount,
        multiplier,
        onAdd: onFloorAdded,
      });
    }
    increaseIncomeRateBy(target, count);
    if (index !== startIndex) critNow(deps, target);
    index += 1;
    if (Math.random() >= DOMINO_EFFECT_CONTINUE_CHANCE) return;
    count *= 2;
  }
}

// Blueprint unlocks the next floor and copies the triggering floor's
// progression and staffing to it for free. The target starts at level 0, so
// replaying the source's upgrade count through the normal rate math preserves
// the target floor's own base economics while matching its upgrade level.
function applyBlueprintCrit(deps: ChainCritDeps, sourceIndex: number): void {
  const { floors, backgroundCount, multiplier, onFloorAdded } = deps;
  const source = floors[sourceIndex];
  const target = floors[sourceIndex + 1];
  if (!source || !target) return;
  if (!target.unlocked) {
    unlockFloor(target);
    ensureLockedFloorAbove({
      floors,
      backgroundCount,
      multiplier,
      onAdd: onFloorAdded,
    });
  }
  increaseIncomeRateBy(target, source.upgradeCount);
  target.workerCount = source.workerCount;
  target.hasManager = source.hasManager;
}

// minimal deps a chain crit needs to grow a building while walking upward —
// a subset of FloorActionsDeps so non-floors callers (cityMap.ts's own
// building-unlock crit, via main.ts) don't need that type's unrelated fields
export interface ChainCritDeps {
  floors: Floor[];
  backgroundCount: number;
  multiplier: BigNumber;
  onFloorAdded: (floor: Floor) => void;
}

// "chain crit" (see upgradeButton.ts's rollCritUpgrade/isChainCrit/
// rollFloorBuyCrit's own chain flag): extends whatever reward `applyToFloor`
// represents onto the floor directly above the one that crit, unconditionally,
// then keeps climbing one floor at a time as long as `continueChance` keeps
// rolling true (defaults to chain's own CHAIN_CRIT_CONTINUE_CHANCE; the
// bounce/explosion procs pass their own dedicated chance instead, see their
// own call sites below). A locked floor in its path is auto-unlocked for free
// (no cost charged, no separate floor-buy crit roll of its own) before getting
// the reward applied. Stops the instant it runs past the building's own floor
// cap (no next floor left to queue, see ensureLockedFloorAbove's own
// MAX_FLOORS_PER_BUILDING guard) — shared by all 3 crit-rolling events (a plain
// upgrade click, unlocking a floor, and cityMap.ts's own unlocking a building),
// each supplying its own `applyToFloor` reward (free upgrade ticks vs a
// permanent critMultiplierTier promotion)
export function applyChainCrit(
  deps: ChainCritDeps,
  startIndex: number,
  applyToFloor: (floor: Floor, isGroundFloor: boolean) => void,
  continueChance: number = CHAIN_CRIT_CONTINUE_CHANCE,
): void {
  const { floors, backgroundCount, multiplier, onFloorAdded } = deps;
  let index = startIndex + 1;
  for (;;) {
    if (index >= floors.length) return;
    const target = floors[index];
    if (!target.unlocked) {
      unlockFloor(target);
      ensureLockedFloorAbove({
        floors,
        backgroundCount,
        multiplier,
        onAdd: onFloorAdded,
      });
    }
    applyToFloor(target, index === 0);
    index += 1;
    if (Math.random() >= continueChance) return;
  }
}

// "explosion crit" (see shared/critTypes's isExplosionCrit): the SAME reward
// walk as applyChainCrit above, but spreads in BOTH directions from the floor
// that actually crit — reuses applyChainCrit unmodified for the upward half
// (auto-unlocking a locked floor in its path, same guaranteed-first-step-then-
// roll-to-continue shape), then walks downward too. No unlock handling is
// needed going down — a building's floors are always unlocked contiguously
// from the ground up, so anything below an unlocked floor is already unlocked
export function applyExplosionCrit(
  deps: ChainCritDeps,
  centerIndex: number,
  applyToFloor: (floor: Floor, isGroundFloor: boolean) => void,
  continueChance: number = EXPLOSION_CRIT_CONTINUE_CHANCE,
): void {
  applyChainCrit(deps, centerIndex, applyToFloor, continueChance);
  const { floors } = deps;
  let index = centerIndex - 1;
  for (;;) {
    if (index < 0) return;
    applyToFloor(floors[index], index === 0);
    index -= 1;
    if (Math.random() >= continueChance) return;
  }
}

// "bounce crit" (see shared/critTypes's isBounceCrit): unlike chain/explosion,
// ONLY ever cascades downward from the floor that actually crit — like a ball
// bouncing down a staircase, never up. Same downward-walk shape as
// applyExplosionCrit's own downward half; no auto-unlock handling needed
// since a building's floors are always unlocked contiguously from the ground
// up, so anything below an already-unlocked floor is already unlocked too
export function applyBounceCrit(
  deps: ChainCritDeps,
  centerIndex: number,
  applyToFloor: (floor: Floor, isGroundFloor: boolean) => void,
  continueChance: number = BOUNCE_CRIT_CONTINUE_CHANCE,
): void {
  const { floors } = deps;
  let index = centerIndex - 1;
  for (;;) {
    if (index < 0) return;
    applyToFloor(floors[index], index === 0);
    index -= 1;
    if (Math.random() >= continueChance) return;
  }
}

// "tick tock crit" (see shared/critTypes's isTickTockCrit): instantly credits
// every unlocked floor extra payouts' worth of income at its own current
// rate, WITHOUT touching floor.lastCollectedAt (see incomePanel.ts's
// currentPayoutAmount) — each floor's own bar keeps ticking from exactly the
// same progress it was already at, it just also gets paid `multiplier`
// payouts right now. `multiplier` defaults to tick tock's own 2x; "fast
// forward" below reuses this exact function with a steeper 4x
function applyTickTockCrit(floors: Floor[], multiplier = 2): void {
  const now = Date.now();
  let total: BigNumber = ZERO;
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    total = add(total, multiply(rewardPayoutAmount(floor, now), multiplier));
  }
  addTotalIncome(total);
}

// "fast forward crit" (see shared/critTypes's isFastForwardCrit): same
// instant-income reward as tick tock above, just a steeper multiplier
const FAST_FORWARD_PAYOUT_MULTIPLIER = 4;
function applyFastForwardCrit(floors: Floor[]): void {
  applyTickTockCrit(floors, FAST_FORWARD_PAYOUT_MULTIPLIER);
}

// "Fire Drill" crit (see shared/critTypes's isFireDrillCrit): unlike tick
// tock above, this COMPLETES each unlocked floor's own income timer — one
// full payout, then the bar restarts from empty
function applyFireDrillCrit(floors: Floor[]): void {
  const now = Date.now();
  let total: BigNumber = ZERO;
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    total = add(total, rewardPayoutAmount(floor, now));
    floor.lastCollectedAt = now;
  }
  addTotalIncome(total);
}

// "Bonus Round" crit: completes only the floor that landed the crit twice,
// then restarts that floor's timer once so other floors and worker state stay
// untouched.
function applyBonusRoundCrit(floor: Floor): void {
  const now = Date.now();
  addTotalIncome(multiply(rewardPayoutAmount(floor, now), 2));
  floor.lastCollectedAt = now;
}

// "Overflow" crit: completes only the floor that landed the crit five times,
// then restarts that floor's timer so other floors and worker state stay
// untouched.
function applyOverflowCrit(floor: Floor): void {
  const now = Date.now();
  addTotalIncome(multiply(rewardPayoutAmount(floor, now), 5));
  floor.lastCollectedAt = now;
}

// "Performance Bonus" crit: completes one current income timer per actual
// worker and manager on every unlocked floor, then restarts each bar.
function applyPerformanceBonusCrit(floors: Floor[]): void {
  const now = Date.now();
  let total: BigNumber = ZERO;
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    const staffingUnits = floor.workerCount + (floor.hasManager ? 1 : 0);
    total = add(total, multiply(rewardPayoutAmount(floor, now), staffingUnits));
    floor.lastCollectedAt = now;
  }
  addTotalIncome(total);
}

function applyShareholdersCrit(floors: Floor[]): void {
  let staffingUnits = 0;
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    staffingUnits += floor.workerCount + (floor.hasManager ? 1 : 0);
  }
  const payoutPercent = Math.min(100, staffingUnits) / 100;
  addTotalIncome(multiply(getTotalIncome(), payoutPercent));
}

function applyOpenBookCrit(): void {
  addTotalIncome(getAllCompaniesUpgradesValue());
}

function applyTeaBreakCrit(floor: Floor, isGroundFloor: boolean): void {
  applyUpgradeTick(floor, isGroundFloor);
}

function applyPriceMatchCrit(floors: Floor[], floor: Floor): void {
  const cheapest = floors
    .filter((candidate) => candidate.unlocked)
    .reduce(
      (cost, candidate) =>
        cost === null || lt(candidate.upgradeCost, cost)
          ? candidate.upgradeCost
          : cost,
      null as BigNumber | null,
    );
  if (cheapest) triggerPriceMatchCrit(floor, cheapest);
}

function applyFirstClassCrit(deps: FloorActionsDeps, source: Floor): void {
  const sourceIndex = deps.floors.indexOf(source);
  const next = deps.floors.find(
    (candidate, index) => index > sourceIndex && !candidate.unlocked,
  );
  if (!next || next.unlocked) return;
  const firstFloorCost = computeBaseFloorStats(1, deps.multiplier).upgradeCost;
  unlockFloor(next);
  next.upgradeCost = firstFloorCost;
  ensureLockedFloorAbove({
    floors: deps.floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
}

function applyLuckyNumberCrit(deps: FloorActionsDeps, source: Floor): void {
  const targetCount =
    LUCKY_NUMBER_MIN_FLOORS +
    Math.floor(
      Math.random() * (LUCKY_NUMBER_MAX_FLOORS - LUCKY_NUMBER_MIN_FLOORS + 1),
    );
  unlockFloorsAbove(deps, source, targetCount);
}

// unlocks up to `targetCount` locked floors above source for free
function unlockFloorsAbove(
  deps: FloorActionsDeps,
  source: Floor,
  targetCount: number,
): void {
  const sourceIndex = deps.floors.indexOf(source);
  let nextIndex = sourceIndex + 1;
  let unlockedCount = 0;

  while (unlockedCount < targetCount) {
    if (nextIndex >= deps.floors.length) {
      const before = deps.floors.length;
      ensureLockedFloorAbove({
        floors: deps.floors,
        backgroundCount: deps.backgroundCount,
        multiplier: deps.multiplier,
        onAdd: deps.onFloorAdded,
      });
      if (deps.floors.length === before) break;
    }

    const next = deps.floors[nextIndex];
    if (!next) break;
    if (!next.unlocked) {
      unlockFloor(next);
      levelFreeFloor(deps.floors, next);
      unlockedCount++;
      ensureLockedFloorAbove({
        floors: deps.floors,
        backgroundCount: deps.backgroundCount,
        multiplier: deps.multiplier,
        onAdd: deps.onFloorAdded,
      });
    }
    nextIndex++;
  }
}

function levelFreeFloor(floors: Floor[], floor: Floor): void {
  const below = floors[floors.indexOf(floor) - 1];
  if (!below) return;
  const level = Math.round(
    below.upgradeCount * CONFIG.crit.freeFloorLevelShare,
  );
  increaseIncomeRateBy(floor, level - floor.upgradeCount);
}

// "frozen crit" (see shared/critTypes's isFrozenCrit): no instant payout —
// just starts upgradeButton.ts's own timed window on this ONE floor (see
// triggerFrozenCrit/isFrozenActive), during which incomePanel.ts's
// increaseIncomeRate skips growing this floor's own upgradeCost entirely —
// upgrades keep costing whatever the price already was when the window
// started, for FROZEN_DURATION_MS
function applyFrozenCrit(floor: Floor): void {
  triggerFrozenCrit(floor);
}

function applySpendingFreezeCrit(floors: Floor[]): void {
  triggerSpendingFreeze(floors);
}

// "snowball crit" (see shared/critTypes's isSnowballCrit): a flat,
// not-tier-scaled proc, same instant-income shape as tick tock/fast forward
// — but instead of a fixed multiplier, it pays every unlocked floor 1 extra
// payout's worth of income at its own current rate, multiplied by however
// many floors are currently unlocked (the more floors owned, the bigger the
// snowball)
function applySnowballCrit(floors: Floor[]): void {
  const unlockedCount = floors.filter((f) => f.unlocked).length;
  applyTickTockCrit(floors, unlockedCount);
}

// "free sale crit" (see shared/critTypes's isFreeSaleCrit): no reward of its
// own — just calls the SAME triggerSaleBoost hud/boostMenu.ts's paid
// purchase already uses, starting an ordinary "Sale" event on this ONE
// floor for free (own window/button state/payout math all reused as-is)
function applyFreeSaleCrit(floor: Floor): void {
  triggerSaleBoost(floor);
}

// "Grand Opening" crit (see shared/critTypes's isGrandOpeningCrit): unlocks
// every currently-locked floor in this building for free, preserving each
// floor's own existing tier/rate/upgrade state (unlike heavenly, which also
// maxes tiers and grants upgrades)
function applyGrandOpeningCrit(deps: FloorActionsDeps): void {
  unlockAllFloors({
    floors: deps.floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
}

function applyMysticCrit(deps: FloorActionsDeps, floor: Floor): void {
  deps.createMysticBuilding();
  const floorIndex = deps.floors.indexOf(floor);
  let nextFloor = deps.floors[floorIndex + 1];
  if (!nextFloor) {
    ensureLockedFloorAbove({
      floors: deps.floors,
      backgroundCount: deps.backgroundCount,
      multiplier: deps.multiplier,
      onAdd: deps.onFloorAdded,
    });
    nextFloor = deps.floors[floorIndex + 1];
  }
  if (!nextFloor) return;

  if (!nextFloor.unlocked) unlockFloor(nextFloor);
  ensureLockedFloorAbove({
    floors: deps.floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
  for (let i = 0; i < MYSTIC_UPGRADE_COUNT; i++) {
    increaseIncomeRate(floor);
  }
}

function applyKeynoteCrit(floor: Floor, isGroundFloor: boolean): void {
  for (let i = 0; i < KEYNOTE_UPGRADE_COUNT; i++) {
    applyUpgradeTick(floor, isGroundFloor);
  }
}

// "Fully Staffed" crit (see shared/critTypes's isFullyStaffedCrit): fills
// every unlocked floor to the existing rendered-worker cap and grants every
// unlocked floor a manager.
// This changes the same state fields as the paid menu actions, but skips all
// spending because the reward is free.
function applyFullyStaffedCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (!floor.unlocked) continue;
    floor.workerCount = MAX_RENDERED_WORKERS;
    floor.hasManager = true;
  }
}

// "Skip" buys every floor and its one-time building upgrades for free, without
// changing floor tiers or upgrade levels.
function applySkipCrit(deps: FloorActionsDeps): void {
  unlockAllFloors({
    floors: deps.floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
  for (const floor of deps.floors) {
    if (!floor.unlocked) continue;
    floor.hasOfficeChairs = true;
    floor.hasOfficeSupplies = true;
    floor.hasManager = true;
  }
  applyFullyStaffedCrit(deps.floors);
}

// "Shift Change" fills only the landing floor and its immediately lower
// unlocked neighbor; floor arrays are stored ground-to-top.
function applyShiftChangeCrit(floors: Floor[], floor: Floor): void {
  const floorIndex = floors.indexOf(floor);
  const targets = [floor, floors[floorIndex - 1]];
  for (const target of targets) {
    if (target?.unlocked) target.workerCount = MAX_RENDERED_WORKERS;
  }
}

// "Reinforcements" copies the strongest unlocked floor workforce to every other
// unlocked floor without charging for workers — only ever levelling floors
// up, never taking workers away from one that's somehow already above the cap
function applyCloneArmyCrit(floors: Floor[]): void {
  const largestWorkerCount = floors.reduce(
    (largest, floor) =>
      floor.unlocked ? Math.max(largest, floor.workerCount) : largest,
    1,
  );
  const target = Math.min(largestWorkerCount, MAX_RENDERED_WORKERS);
  for (const floor of floors) {
    if (floor.unlocked) {
      floor.workerCount = Math.max(floor.workerCount, target);
    }
  }
}

// "Espresso Shot" crit (see shared/critTypes's isEspressoShotCrit): applies
// the normal all-worker boost for its regular 15-second duration
function applyEspressoShotCrit(floors: Floor[]): void {
  applyFloorBoost(floors);
}

// "Deja Vu" crit (see shared/critTypes's isDejaVuCrit): picks one of the
// existing crit tiers uniformly, then applies that tier's free-upgrade batch
// twice without rolling another crit or piggyback proc.
function randomDejaVuTier(): CritTier {
  return CRIT_TIER_ORDER[Math.floor(Math.random() * CRIT_TIER_ORDER.length)];
}

function applyDejaVuCrit(floor: Floor, isGroundFloor: boolean): void {
  const count = CRIT_TIER_CONFIG[randomDejaVuTier()].multiplier;
  for (let repetition = 0; repetition < 2; repetition++) {
    for (let i = 0; i < count; i++) {
      applyUpgradeTick(floor, isGroundFloor);
    }
  }
}

// "Double Down" crit (see shared/critTypes's isDoubleDownCrit): same shape as
// Deja Vu above, but replays the tier that ACTUALLY landed rather than a
// random one — so its value rides on whatever crit spawned it
function applyDoubleDownCrit(
  floor: Floor,
  isGroundFloor: boolean,
  tier: CritTier,
): void {
  const count = CRIT_TIER_CONFIG[tier].multiplier;
  for (
    let repetition = 0;
    repetition < DOUBLE_DOWN_CRIT_REPEATS;
    repetition++
  ) {
    for (let i = 0; i < count; i++) applyUpgradeTick(floor, isGroundFloor);
  }
}

// "payday crit" (see shared/critTypes's isPaydayCrit): a flat one-time
// effect, same shape as booty — triples the currently active company's
// total income once
function applyPaydayCrit(): void {
  addTotalIncome(multiply(getTotalIncome(), 2));
}

// "gold standard crit" (see shared/critTypes's isGoldStandardCrit): same
// flat one-time effect as payday, just a steeper multiplier — quadruples
// the currently active company's total income once
function applyGoldStandardCrit(): void {
  addTotalIncome(multiply(getTotalIncome(), 3));
}

// "special crit crit" bonus tier (see shared/critTypes's getBonusTierCrit and
// shared/bonusTierReward): rides on whatever the proc(s) already granted
function applyBonusTierCrit(bonusTier: CritTier): void {
  applyBonusTierIncome(bonusTier);
}

// "Chair Giveaway"/"Supplies Giveaway" crits (see shared/critTypes's isChairGiveawayCrit/
// isSuppliesGiveawayCrit): grant the floor being upgraded its one-time office
// chairs/supplies purchase for free (same flags hud/upgradeMenu's own paid
// buyOfficeChairs/buyOfficeSupplies set) — a no-op if the floor already has it
function applyChairGiveawayCrit(floor: Floor): void {
  floor.hasOfficeChairs = true;
}

function applySuppliesGiveawayCrit(floor: Floor): void {
  floor.hasOfficeSupplies = true;
}

// "Supply Run" crit (see shared/critTypes's isSupplyRunCrit): both giveaways
// above at once, on the floor that actually crit
function applySupplyRunCrit(floor: Floor): void {
  applyChairGiveawayCrit(floor);
  applySuppliesGiveawayCrit(floor);
}

// "Intern"/"Union Boss" crits (see shared/critTypes's isInternCrit/
// isUnionBossCrit): grant the floor being upgraded one free worker/manager
// (same fields hud/upgradeMenu's own paid buyWorker/buyManager set), for
// free — Intern is capped at MAX_RENDERED_WORKERS (same cap buyWorker
// itself enforces), Union Boss is a no-op if the floor already has a manager
function applyInternCrit(floor: Floor): void {
  if (floor.workerCount < MAX_RENDERED_WORKERS) floor.workerCount += 1;
}

// "Talent Scout" crit: hire one capped real worker first, then boost every
// actual worker slot now present on the critted floor. No virtual slots or
// manager state are involved.
function applyTalentScoutCrit(floor: Floor): void {
  applyInternCrit(floor);
  const now = Date.now();
  for (let workerIndex = 0; workerIndex < floor.workerCount; workerIndex++) {
    activateBoosted(floor, workerIndex, now, BOOST_DURATION_MS);
  }
}

function applyUnionBossCrit(floor: Floor): void {
  floor.hasManager = true;
}

// "Golden Handshake" crit (see shared/critTypes's isGoldenHandshakeCrit):
// Union Boss applied to every unlocked floor at once
function applyGoldenHandshakeCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (floor.unlocked) applyUnionBossCrit(floor);
  }
}

// "Team Building" crit (see shared/critTypes's isTeamBuildingCrit): the same
// idea for Intern — one free worker on every unlocked floor at once
function applyTeamBuildingCrit(floors: Floor[]): void {
  for (const floor of floors) {
    if (floor.unlocked) applyInternCrit(floor);
  }
}

// "Team Lunch" crit: boost only the real worker slots on the floor that
// landed the crit, with exactly twice the normal boost duration. Managers and
// virtual worker slots are intentionally excluded.
const TEAM_LUNCH_BOOST_DURATION_MS = BOOST_DURATION_MS * 2;
function applyTeamLunchCrit(floor: Floor): void {
  const now = Date.now();
  for (let workerIndex = 0; workerIndex < floor.workerCount; workerIndex++) {
    activateBoosted(floor, workerIndex, now, TEAM_LUNCH_BOOST_DURATION_MS);
  }
}

// "Spring Cleaning" crit (see shared/critTypes's isSpringCleaningCrit): wipes
// each unlocked floor back to its own level-0 economy (rate/interval/cost, no
// banked upgrades) but one permanent tier higher — a fresh floor that earns
// more per upgrade from here on. A floor already at the top tier has nothing
// to trade its upgrades for, so it's skipped entirely. Workers/manager/office
// upgrades and the building's accumulated price discount all survive
function applySpringCleaningCrit(floors: Floor[], multiplier: BigNumber): void {
  for (const [index, floor] of floors.entries()) {
    if (!floor.unlocked) continue;
    const promoted = nextCritTier(floor.critMultiplierTier);
    if (promoted === floor.critMultiplierTier) continue;
    const base = computeBaseFloorStats(index + 1, multiplier);
    floor.incomeAmount = base.incomeAmount;
    floor.incomeIntervalSeconds = base.incomeIntervalSeconds;
    floor.rateStep = base.rateStep;
    floor.upgradeCost = multiply(
      base.upgradeCost,
      floor.priceDiscountMultiplier,
    );
    floor.upgradeCount = 0;
    floor.critMultiplierTier = promoted;
  }
}

// "Rush Hour" crit (see shared/critTypes's isRushHourCrit): no instant
// payout — just starts the building-wide timed window (see
// triggerRushHourCrit/isRushHourActive) during which every unlocked floor's
// own income timer is capped at RUSH_HOUR_INTERVAL_SECONDS (see
// incomePanel.ts's currentSpeedMultiplier)
function applyRushHourCrit(floors: Floor[]): void {
  triggerRushHourCrit(floors);
}

function applyRateLockCrit(floor: Floor): void {
  triggerRateLockCrit(floor);
}

// "Golden Ticket" crit (see shared/critTypes's isGoldenTicketCrit): no
// instant payout — just arms upgradeButton.ts's own armGuaranteedUltraCrit
// so the very next rollCritUpgrade call on this floor is forced straight to
// ultra, bypassing every tier/proc chance entirely for that one roll
function applyGoldenTicketCrit(floor: Floor): void {
  armGuaranteedUltraCrit(floor);
}

// "Silver Ticket" crit (see shared/critTypes's isSilverTicketCrit): same
// shape as Golden Ticket above, but forces the very next rollCritUpgrade
// call on this floor to mega instead
function applySilverTicketCrit(floor: Floor): void {
  armGuaranteedMegaCrit(floor);
}

// "Lucky Clover" crit (see shared/critTypes's isLuckyCloverCrit): instantly
// pays out LUCKY_CLOVER_CRIT_COUNT back-to-back ultra-tier crits on this
// floor, all at once
function applyLuckyCloverCrit(floor: Floor, isGroundFloor: boolean): void {
  const count = CRIT_TIER_CONFIG[LUCKY_CLOVER_CRIT_TIER].multiplier;
  for (let run = 0; run < LUCKY_CLOVER_CRIT_COUNT; run++) {
    for (let i = 0; i < count; i++) applyUpgradeTick(floor, isGroundFloor);
  }
}

// "Second Wind" crit (see shared/critTypes's isSecondWindCrit): hands back
// every dollar the active company has spent on upgrades, floor unlocks and
// building purchases — nothing bought is lost, the money just comes back
function applySecondWindCrit(): void {
  addTotalIncome(getActiveCompanyInvestedValue());
}

// "Golden Parachute" crit (see shared/critTypes's isGoldenParachuteCrit): a
// flat, not-tier-scaled instant payout — unlike payday/gold standard (which
// multiply the ALREADY-BANKED total), this pays out GOLDEN_PARACHUTE_SECONDS
// worth of the currently active company's own combined income rate across
// EVERY one of its buildings (see totalIncome.ts's
// getCompanyIncomeRatePerSecond), so it's worth the same regardless of how
// much the company has banked up so far
const GOLDEN_PARACHUTE_SECONDS = 15;
function applyGoldenParachuteCrit(): void {
  const rate = getCompanyIncomeRatePerSecond(getActiveCompanyIndex());
  addTotalIncome(multiply(rate, GOLDEN_PARACHUTE_SECONDS));
}

// "Rain Check" pays five seconds of the building that produced the crit,
// summing the current rate of each unlocked floor in that building only.
function applyRainCheckCrit(floors: Floor[]): void {
  const now = Date.now();
  const buildingRate = floors.reduce(
    (total, floor) =>
      floor.unlocked
        ? add(total, currentIncomeRatePerSecond(floor, now))
        : total,
    ZERO,
  );
  addTotalIncome(multiply(buildingRate, RAIN_CHECK_CRIT_SECONDS));
}

// Cash Flow pays one income cycle for every building in every corporation.
// The combined-rate helper uses live active buildings and persisted dormant
// company rates, so this never loads dormant floors.
function applyCashFlowCrit(): void {
  addTotalIncome(getAllCompaniesIncomeRatePerSecond());
}

// "Payout" crit (see shared/critTypes's isPayoutCrit): the biggest flat
// one-time jackpot — instantly adds the combined total income + upgrades
// value across EVERY corporation (not just the active one) to the
// currently active company's own total (see totalIncome.ts's
// getAllCompaniesTotalIncome/getAllCompaniesUpgradesValue)
function applyPayoutCrit(): void {
  addTotalIncome(
    add(getAllCompaniesTotalIncome(), getAllCompaniesUpgradesValue()),
  );
}

// "winter sale"/"spring sale"/"summer sale"/"autumn sale"/"halloween sale"
// crits (see shared/critTypes's isWinterSaleCrit etc.) — all five share this
// exact reward shape, only their icon/label/color AND discount size differ
// (halloween's own HALLOWEEN_SALE_DISCOUNT_MULTIPLIER is steeper than the 4
// seasonal ones' shared SEASONAL_SALE_DISCOUNT_MULTIPLIER, so this takes the
// discount as a param instead of hardcoding one constant): permanently cuts
// EVERY floor's own upgrade cost, worker/office chairs/supplies/manager
// costs (via Floor.priceDiscountMultiplier, folded into hud/upgradeMenu's
// getFloorPrice), AND the cost to unlock the next floor, by
// `discountMultiplier`, for every floor in the WHOLE building this roll
// happened in — including the one still-locked floor waiting at the top (its
// own unlockCost is a real, not-yet-paid price too, and floors/index.ts's
// ensureLockedFloorAbove reads priceDiscountMultiplier back off the ground
// floor to keep every FUTURE queued floor discounted the same way, so
// repeated procs really do stack building-wide forever, not just for floors
// that already existed)
function applySeasonalSaleCrit(
  floors: Floor[],
  discountMultiplier: number,
): void {
  for (const floor of floors) {
    floor.priceDiscountMultiplier *= discountMultiplier;
    if (floor.unlocked) {
      floor.upgradeCost = multiply(floor.upgradeCost, discountMultiplier);
    } else {
      floor.unlockCost = multiply(floor.unlockCost, discountMultiplier);
    }
  }
}

// everything a proc's reward handler could need, so the one shared table
// below can serve every consumption site (a per-click crit, a floor-unlock
// crit, and Deja Vu's own spawned follow-ups) instead of each re-listing all
// 59 procs in its own if-chain
export interface CritRewardContext {
  deps: FloorActionsDeps;
  floors: Floor[];
  floor: Floor;
  isGroundFloor: boolean;
  tier: CritTier;
  // how many free upgrade ticks the landed tier is worth
  count: number;
  // this building's own economy scale (see buildings/getBuildingMultiplier)
  multiplier: BigNumber;
}

// featured rewards only see their own narrow context type, but are always
// handed this full one (see featuredRewards/index.ts)
function asRewardContext(context: FeaturedRewardContext): CritRewardContext {
  return context as CritRewardContext;
}

const CELEBRATED_PROMOTIONS = 6;

const CRIT_REWARDS: Record<CritProcKind, (context: CritRewardContext) => void> =
  {
    ...createFeaturedCritRewards({
      upgrade: (floors, count) => {
        for (const floor of floors) {
          if (!floor.unlocked) continue;
          increaseIncomeRateBy(floor, count);
        }
      },
      payCycles: applyTickTockCrit,
      incomeRate: currentIncomeRatePerSecond,
      addIncomeShare: (fraction) =>
        addTotalIncome(multiply(getTotalIncome(), fraction)),
      addIncomeSeconds: (seconds) =>
        addTotalIncome(
          multiply(
            getCompanyIncomeRatePerSecond(getActiveCompanyIndex()),
            seconds,
          ),
        ),
      repeatCrit: (context, direction, continueChance) => {
        const c = asRewardContext(context);
        const start = c.floors.indexOf(c.floor);
        const reward = (reached: Floor, isGround: boolean) => {
          for (let i = 0; i < c.count; i++) applyUpgradeTick(reached, isGround);
        };
        if (direction === "up") {
          applyChainCrit(c.deps, start, reward, continueChance);
        } else if (direction === "down") {
          applyBounceCrit(c.deps, start, reward, continueChance);
        } else {
          applyExplosionCrit(c.deps, start, reward, continueChance);
        }
      },
      armCrit: (floors, tier) => {
        for (const floor of floors) {
          if (floor.unlocked) armCritUpgrade(floor, tier);
        }
      },
      unlockFloors: (context, count) => {
        const c = asRewardContext(context);
        unlockFloorsAbove(c.deps, c.floor, count);
      },
      hireWorkers: (floors, count) => {
        for (const floor of floors) {
          if (!floor.unlocked) continue;
          const room = Math.max(0, MAX_RENDERED_WORKERS - floor.workerCount);
          floor.workerCount += Math.min(count, room);
          // a floor with no room for the hires promotes one worker a perma tier instead
          const promotable = getBoostEventCandidates(floor);
          if (count > room && promotable.length > 0)
            promoteWorkerPermaTier(floor, promotable[0]);
        }
      },
      hireManagers: (floors) => {
        for (const floor of floors) {
          if (floor.unlocked) applyUnionBossCrit(floor);
        }
      },
      giveOfficeChairs: (floors) => {
        for (const floor of floors) {
          if (floor.unlocked) applyChairGiveawayCrit(floor);
        }
      },
      giveOfficeSupplies: (floors) => {
        for (const floor of floors) {
          if (floor.unlocked) applySuppliesGiveawayCrit(floor);
        }
      },
      boostWorkers: (floors, seconds, extraWorkers) => {
        const durationMs = seconds * 1000;
        const unlocked = floors.filter((floor) => floor.unlocked);
        applyFloorBoost(unlocked, durationMs);
        const now = Date.now();
        for (const floor of unlocked) {
          const firstVirtualIndex = getRenderedWorkerCount(floor);
          for (let i = 0; i < extraWorkers; i++) {
            activateBoosted(floor, firstVirtualIndex + i, now, durationMs);
          }
        }
      },
      discountPrices: (floors, fraction) =>
        applySeasonalSaleCrit(floors, 1 - fraction),
      raiseLevels: (floors, level) => {
        for (const floor of floors) {
          if (floor.unlocked && floor.upgradeCount < level) {
            increaseIncomeRateBy(floor, level - floor.upgradeCount);
          }
        }
      },
      addUpgradePriceCash: (floors, multiple) => {
        for (const floor of floors) {
          if (floor.unlocked)
            addTotalIncome(multiply(floor.upgradeCost, multiple));
        }
      },
      growLevels: (floors, fraction) => {
        for (const floor of floors) {
          if (!floor.unlocked) continue;
          increaseIncomeRateBy(
            floor,
            Math.max(1, Math.ceil(floor.upgradeCount * fraction)),
          );
        }
      },
      spreadUpgrades: (floors, total) => {
        const unlocked = floors.filter((floor) => floor.unlocked);
        if (unlocked.length === 0) return;
        const levels = unlocked.map((floor) => floor.upgradeCount);
        const given = unlocked.map(() => 0);
        for (let i = 0; i < total; i++) {
          let lowest = 0;
          for (let j = 1; j < levels.length; j++) {
            if (levels[j] < levels[lowest]) lowest = j;
          }
          levels[lowest] += 1;
          given[lowest] += 1;
        }
        unlocked.forEach((floor, j) => increaseIncomeRateBy(floor, given[j]));
      },
      raiseWorkerTiers: (floors, share, steps) => {
        const climbers = floors
          .filter((floor) => floor.unlocked)
          .flatMap((floor) =>
            getBoostEventCandidates(floor).map((workerIndex) => ({
              floor,
              workerIndex,
            })),
          )
          .sort(() => Math.random() - 0.5);
        const count = Math.min(
          climbers.length,
          Math.max(1, Math.ceil(climbers.length * share)),
        );
        const now = Date.now();
        climbers.slice(0, count).forEach(({ floor, workerIndex }, i) => {
          for (let step = 0; step < steps; step++)
            promoteWorkerPermaTier(floor, workerIndex);
          // only a few celebrate, so a big promotion doesn't stack dozens of sounds
          if (i < CELEBRATED_PROMOTIONS)
            celebrateWorkerBoost(floor, workerIndex, now);
        });
      },
      startEvent: (floors, event) => {
        const unlocked = floors.filter((floor) => floor.unlocked);
        if (event === "spendingFreeze") triggerSpendingFreeze(unlocked);
        else if (event === "rushHour") triggerRushHourCrit(unlocked);
        else {
          for (const floor of unlocked) {
            if (event === "sale") triggerSaleBoost(floor);
            else triggerFrozenCrit(floor);
          }
        }
      },
    }),
    openBook: () => applyOpenBookCrit(),
    firstClass: (c) => applyFirstClassCrit(c.deps, c.floor),
    luckyNumber: (c) => applyLuckyNumberCrit(c.deps, c.floor),
    powerSurge: (c) => c.deps.applyCompanyWideBoost(),
    priceMatch: (c) => applyPriceMatchCrit(c.floors, c.floor),
    executiveBonus: (c) =>
      addTotalIncome(multiply(c.deps.getCompanyValue(), 0.25)),
    boost: (c) => applyFloorBoost(c.floors),
    booty: () => addTotalIncome(getTotalIncome()),
    bullMarket: (c) => applyBullMarketCrit(c.floors),
    upgrade: (c) => {
      c.floor.critMultiplierTier = nextCritTier(c.floor.critMultiplierTier);
    },
    peppermint: (c) => applyPeppermintCrit(c.floors),
    heavenly: (c) => applyHeavenlyCrit(c.deps),
    pair: (c) =>
      applyPokerHandCrit(
        c.deps,
        c.floors.indexOf(c.floor),
        POKER_HAND_CRIT_COUNTS.pair,
      ),
    threeOfAKind: (c) =>
      applyPokerHandCrit(
        c.deps,
        c.floors.indexOf(c.floor),
        POKER_HAND_CRIT_COUNTS.threeOfAKind,
      ),
    fourOfAKind: (c) =>
      applyPokerHandCrit(
        c.deps,
        c.floors.indexOf(c.floor),
        POKER_HAND_CRIT_COUNTS.fourOfAKind,
      ),
    fullHouse: (c) =>
      applyPokerHandCrit(
        c.deps,
        c.floors.indexOf(c.floor),
        POKER_HAND_CRIT_COUNTS.fullHouse,
      ),
    // unlike the fixed-count hands above, this one climbs all the way to the
    // building's own cap, auto-unlocking as it goes
    royalFlush: (c) =>
      applyPokerHandCrit(
        c.deps,
        c.floors.indexOf(c.floor),
        MAX_FLOORS_PER_BUILDING,
      ),
    tickTock: (c) => applyTickTockCrit(c.floors),
    chairGiveaway: (c) => applyChairGiveawayCrit(c.floor),
    suppliesGiveaway: (c) => applySuppliesGiveawayCrit(c.floor),
    winterSale: (c) =>
      applySeasonalSaleCrit(c.floors, SEASONAL_SALE_DISCOUNT_MULTIPLIER),
    springSale: (c) =>
      applySeasonalSaleCrit(c.floors, SEASONAL_SALE_DISCOUNT_MULTIPLIER),
    summerSale: (c) =>
      applySeasonalSaleCrit(c.floors, SEASONAL_SALE_DISCOUNT_MULTIPLIER),
    autumnSale: (c) =>
      applySeasonalSaleCrit(c.floors, SEASONAL_SALE_DISCOUNT_MULTIPLIER),
    halloweenSale: (c) =>
      applySeasonalSaleCrit(c.floors, HALLOWEEN_SALE_DISCOUNT_MULTIPLIER),
    easterSale: (c) =>
      applySeasonalSaleCrit(c.floors, EASTER_SALE_DISCOUNT_MULTIPLIER),
    sunshine: (c) => applySunshineCrit(c.floors),
    snowday: (c) => applySnowdayCrit(c.floors),
    fastForward: (c) => applyFastForwardCrit(c.floors),
    frozen: (c) => applyFrozenCrit(c.floor),
    spendingFreeze: (c) => applySpendingFreezeCrit(c.floors),
    snowball: (c) => applySnowballCrit(c.floors),
    freeSale: (c) => applyFreeSaleCrit(c.floor),
    payday: () => applyPaydayCrit(),
    goldStandard: () => applyGoldStandardCrit(),
    nightShift: (c) => applyNightShiftCrit(c.floors),
    intern: (c) => applyInternCrit(c.floor),
    talentScout: (c) => applyTalentScoutCrit(c.floor),
    unionBoss: (c) => applyUnionBossCrit(c.floor),
    rushHour: (c) => applyRushHourCrit(c.floors),
    rateLock: (c) => applyRateLockCrit(c.floor),
    goldenTicket: (c) => applyGoldenTicketCrit(c.floor),
    silverTicket: (c) => applySilverTicketCrit(c.floor),
    goldenParachute: () => applyGoldenParachuteCrit(),
    rainCheck: (c) => applyRainCheckCrit(c.floors),
    cashFlow: () => applyCashFlowCrit(),
    payout: () => applyPayoutCrit(),
    grandOpening: (c) => applyGrandOpeningCrit(c.deps),
    fullyStaffed: (c) => applyFullyStaffedCrit(c.floors),
    skip: (c) => applySkipCrit(c.deps),
    shiftChange: (c) => applyShiftChangeCrit(c.floors, c.floor),
    espressoShot: (c) => applyEspressoShotCrit(c.floors),
    dejaVu: (c) => applyDejaVuCrit(c.floor, c.isGroundFloor),
    cloneArmy: (c) => applyCloneArmyCrit(c.floors),
    luckyClover: (c) => applyLuckyCloverCrit(c.floor, c.isGroundFloor),
    secondWind: () => applySecondWindCrit(),
    executiveOrder: (c) => applyExecutiveOrderCrit(c.floors),
    roundUp: (c) => applyRoundUpCrit(c.floors),
    safetyNet: (c) => applySafetyNetCrit(c.floors),
    floorShare: (c) => applyFloorShareCrit(c.floors, c.floor),
    sameBoat: (c) => applyFloorShareCrit(c.floors, c.floor, 2),
    goldenHandshake: (c) => applyGoldenHandshakeCrit(c.floors),
    supplyRun: (c) => applySupplyRunCrit(c.floor),
    casualFriday: (c) =>
      applyFlatUpgradeBatch(c.floors, CASUAL_FRIDAY_CRIT_UPGRADES),
    fancyFriday: (c) =>
      applyFlatUpgradeBatch(c.floors, FANCY_FRIDAY_CRIT_UPGRADES),
    fireDrill: (c) => applyFireDrillCrit(c.floors),
    bonusRound: (c) => applyBonusRoundCrit(c.floor),
    overflow: (c) => applyOverflowCrit(c.floor),
    performanceBonus: (c) => applyPerformanceBonusCrit(c.floors),
    teaBreak: (c) => applyTeaBreakCrit(c.floor, c.isGroundFloor),
    doubleDown: (c) => applyDoubleDownCrit(c.floor, c.isGroundFloor, c.tier),
    coffeeRun: (c) => applyCoffeeRunCrit(c.floors),
    dressCode: (c) => applyDressCodeCrit(c.floors),
    recruitmentDrive: (c) => applyRecruitmentDriveCrit(c.floors, c.floor),
    merger: (c) => applyMergerCrit(c.floors, c.floor),
    shareholders: (c) => applyShareholdersCrit(c.floors),
    teamBuilding: (c) => applyTeamBuildingCrit(c.floors),
    teamLunch: (c) => applyTeamLunchCrit(c.floor),
    springCleaning: (c) => applySpringCleaningCrit(c.floors, c.multiplier),
    nightOwl: (c) => applyNightOwlCrit(c.floors),
    headhunter: (c) => applyHeadhunterCrit(c.floor, c.floors),
    blueprint: (c) => applyBlueprintCrit(c.deps, c.floors.indexOf(c.floor)),
    keynote: (c) => applyKeynoteCrit(c.floor, c.isGroundFloor),
    mystic: (c) => applyMysticCrit(c.deps, c.floor),
    dominoEffect: (c) =>
      applyDominoEffectCrit(c.deps, c.floors.indexOf(c.floor)),
    chain: (c) =>
      applyChainCrit(c.deps, c.floors.indexOf(c.floor), (reached, isGround) => {
        for (let i = 0; i < c.count; i++) applyUpgradeTick(reached, isGround);
        critNow(c.deps, reached);
      }),
    bounce: (c) =>
      applyBounceCrit(
        c.deps,
        c.floors.indexOf(c.floor),
        (reached, isGround) => {
          for (let i = 0; i < c.count; i++) applyUpgradeTick(reached, isGround);
          critNow(c.deps, reached);
        },
        BOUNCE_CRIT_CONTINUE_CHANCE,
      ),
    explosion: (c) =>
      applyExplosionCrit(
        c.deps,
        c.floors.indexOf(c.floor),
        (reached, isGround) => {
          for (let i = 0; i < c.count; i++) applyUpgradeTick(reached, isGround);
          critNow(c.deps, reached);
        },
      ),
  };

// a crit that lands on `floor` and pays out immediately, without arming its button
function critNow(
  deps: FloorActionsDeps,
  floor: Floor,
  allowSpecialProcs = true,
): void {
  const result = rollInstantCrit(allowSpecialProcs);
  if (result) applyFloorCrit(deps, floor, result, allowSpecialProcs);
}

// what an event proc rolled or armed by a click in this building can work with
function eventProcContext(
  deps: FloorActionsDeps,
  isGroundFloor: boolean,
): EventProcContext {
  return {
    floors: deps.floors,
    getOnScreenFloors: deps.getOnScreenFloors,
    getFloorRect: deps.getFloorRect,
    getScreenAreaLocal: deps.getScreenAreaLocal,
    isGroundFloor,
    applyTierCrit: (floor, tier) => {
      applyFloorCrit(deps, floor, tierOnlyCrit(tier), false);
      deps.persist();
    },
    applyProcCrit: (floor, tier, kind) => {
      const result = tierOnlyCrit(tier);
      result[kind] = true;
      applyFloorCrit(deps, floor, result);
      recordCritProcLanded(kind);
      deps.persist();
    },
    promoteFloorTier: (floor, tier) => {
      floor.critMultiplierTier = tier;
      triggerButtonPress(floor);
      triggerCritCelebration(floor, tier, deps.getScreenCenterLocal);
      deps.persist();
    },
    unlockFloorFree: (floor) => {
      completeFloorUnlock(deps, floor, true);
      levelFreeFloor(deps.floors, floor);
      deps.persist();
    },
    upgradeFloorFree: (floor, levels) => {
      increaseIncomeRateBy(floor, levels);
      deps.persist();
    },
  };
}

// everything a floor unlock does once it's paid for (or granted by an event);
// fromEvent (the Unlock event) also raises the floor's permanent tier to a
// landed crit's and slams its price before dropping the overlay, where a
// click just bursts coins
function completeFloorUnlock(
  deps: FloorActionsDeps,
  floor: Floor,
  fromEvent = false,
): void {
  const { floors } = deps;
  unlockFloor(floor);
  if (fromEvent) startFloorUnlockAnim(floor);
  playSold();
  ensureLockedFloorAbove({
    floors,
    backgroundCount: deps.backgroundCount,
    multiplier: deps.multiplier,
    onAdd: deps.onFloorAdded,
  });
  const buyTier = rollFloorBuyCrit();
  if (buyTier) {
    // an armed "force bonus tier" test button (see forceBonusTierCritProc)
    // always arms buildings[activeBuildingIndex][0] (main.ts's own test
    // wiring — the only floor a test button can address), which is never
    // the actual locked `floor` being unlocked here (floor 0 always
    // starts unlocked already) — so this searches the WHOLE building
    // instead of just this one floor, unlike the plain-click branch
    // (where the armed floor and the clicked floor are always the
    // same, so a direct getBonusTierCrit(floor) there is correct)
    const forcedBonusTierFloor = floors.find((f) => getBonusTierCrit(f));
    if (forcedBonusTierFloor) {
      buyTier.bonusTier = getBonusTierCrit(forcedBonusTierFloor)!;
      consumeBonusTierCrit(forcedBonusTierFloor);
    }
    if (fromEvent) {
      floor.critMultiplierTier = pickHigherCritTier(
        floor.critMultiplierTier,
        buyTier.tier,
      );
    }
    applyFloorCrit(deps, floor, buyTier);
    critNow(deps, floor);
  }
  const center = getLockCenter();
  const burst = () => spawnCoinBurst(floor, center.x, center.y, () => {});
  // an event unlock bursts as its slammed price and overlay disappear
  if (fromEvent) setTimeout(burst, UNLOCK_OVERLAY_MS);
  else burst();
}

export function applyFloorCrit(
  deps: FloorActionsDeps,
  floor: Floor,
  result: CritRollResult,
  allowSpecialProcs = true,
): void {
  if (!allowSpecialProcs) result = tierOnlyCrit(result.tier);
  const isGroundFloor = deps.floors.indexOf(floor) === 0;
  const count = CRIT_TIER_CONFIG[result.tier].multiplier;
  for (let tick = 0; tick < count; tick++)
    applyUpgradeTick(floor, isGroundFloor);
  const context: CritRewardContext = {
    deps,
    floors: deps.floors,
    floor,
    isGroundFloor,
    tier: result.tier,
    count,
    multiplier: deps.multiplier,
  };
  applyCritProcs(result, context, CRIT_REWARDS);
  if (result.bonusTier) applyBonusTierCrit(result.bonusTier);
  triggerButtonPress(floor);
  triggerCritCelebration(
    floor,
    result.tier,
    deps.getScreenCenterLocal,
    result,
    result.bonusTier,
    (kind) => grantFollowUpProc(kind, context),
  );
}

// Deja Vu's spawned follow-ups go through the exact same reward dispatcher
// and collectible tally a genuinely rolled proc does — they used to be
// celebration-only, so a follow-up Heavenly flashed without ever unlocking a
// single floor or counting toward its badge
function grantFollowUpProc(
  kind: CritProcKind,
  context: CritRewardContext,
): void {
  applyCritProcs(onlyCritProc(kind), context, CRIT_REWARDS);
  recordCritProcLanded(kind);
}

// one Sale-click payout for `floor`: a full bar of its current payout (times
// multiplier) straight to the total — never into floor.incomeAmount, or each
// click would raise the rate the next one reads — with coins flying from its button
function paySaleClick(
  floor: Floor,
  isGroundFloor: boolean,
  multiplier: number,
): void {
  const gained = multiply(currentPayoutAmount(floor, Date.now()), multiplier);
  addTotalIncome(gained);
  const center = getButtonCenter(isGroundFloor);
  const jitterX = (Math.random() - 0.5) * (BTN_W * 0.75);
  const jitterY = (Math.random() - 0.5) * (BTN_H / 2);
  spawnHomingCoinBurst(floor, center.x + jitterX, center.y + jitterY, {
    ...EVENT_COIN_TIMING,
    onEachArrive: pulseHudTotalFlash,
  });
}

// handles a click at floor-local (x, y): unlocking, upgrading, or clicking a worker.
// every hit test/mutation here is identical to the old per-canvas click listener,
// just no longer tied to any one floor owning its own DOM canvas + event listener.
export function handleFloorClick(
  deps: FloorActionsDeps,
  floor: Floor,
  x: number,
  y: number,
  isGroundFloor: boolean,
): void {
  if (
    isScreenFrozen() ||
    isFloorLocked(floor) ||
    (isDetachedJobPending() && !isDetachedJobRunning())
  )
    return;
  const { floors, multiplier, persist, getScreenCenterLocal } = deps;

  if (
    canCancelOvertime(floor, Date.now()) &&
    hitTestIncomeBar(x, y, isGroundFloor)
  ) {
    tapOvertimeBar(floor, Date.now());
    persist();
    triggerIncomeBarPress(floor);
    return;
  }

  if (hitTestFloorLock(x, y, floor)) {
    if (spendTotalIncome(floor.unlockCost)) {
      completeFloorUnlock(deps, floor);
      // after the celebration, not before: Deja Vu grants its follow-up procs'
      // rewards synchronously from in there, and they'd otherwise miss this save
      persist();
    }
    return;
  }

  if (hitTestUpgradeButton(x, y, isGroundFloor) && floor.unlocked) {
    // a mirrored clone (see floors/swarmEvent) clicks its source button
    const source = resolveButtonFloor(floor);
    if (source !== floor) {
      const sourceIsGround = floors.indexOf(source) === 0;
      const center = getButtonCenter(sourceIsGround);
      handleFloorClick(deps, source, center.x, center.y, sourceIsGround);
      return;
    }
    announceEventStartClick(floor, Date.now());
    // "Hunt" event (see floors/huntEvent): free like Boost below, falling
    // through as a normal click if the mouse has left the screen meanwhile
    if (isHuntEventArmed(floor)) {
      disarmHuntEvent(floor);
      if (startHuntEvent(floor, isGroundFloor, deps.getOnScreenFloors)) {
        triggerButtonPress(floor);
        playCoinDrop();
        return;
      }
    }
    // "Boost" event (see floors/boostEvent): free, and leaves any armed crit
    // for the next click. If no on-screen worker is left to pick, the button
    // just disarms and this click falls through as a normal one
    if (isBoostEventArmed(floor)) {
      disarmBoostEvent(floor);
      if (
        startBoostEvent(floor, isGroundFloor, deps.getOnScreenFloors, persist)
      ) {
        triggerButtonPress(floor);
        playCoinDrop();
        return;
      }
    }
    // "Union" event (see floors/unionEvent): free like Boost, falling through
    // as a normal click if the floor no longer has workers to merge
    if (isUnionEventArmed(floor)) {
      disarmUnionEvent(floor);
      if (startUnionEvent(floor, persist)) {
        triggerButtonPress(floor);
        playCoinDrop();
        return;
      }
    }
    // "Swarm" event (see floors/swarmEvent): free, starts the timed swarm
    // sale and leaves any armed crit for the next click
    if (isSwarmEventArmed(floor)) {
      disarmSwarmEvent(floor);
      triggerSwarmSale(floor);
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      return;
    }
    // an active swarm sale: every click is a Sale click on this button and
    // each of its mirrored clones (see floors/swarmEvent)
    if (isSwarmSaleActive(floor, Date.now())) {
      const tier = getCritTier(floor);
      if (tier) consumeCritUpgrade(floor);
      const multiplier = tier ? CRIT_TIER_CONFIG[tier].multiplier : 1;
      paySaleClick(floor, isGroundFloor, multiplier);
      for (const clone of getButtonMirrors(floor)) {
        paySaleClick(clone.floor, clone.isGroundFloor, multiplier);
      }
      rollCritUpgrade(floor, false);
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      if (tier) triggerCritCelebration(floor, tier, getScreenCenterLocal);
      return;
    }
    // "Sale" boost: free clicks that add upgradeCount straight to incomeAmount,
    // instead of the normal cost/rateStep math — takes priority over the crit
    // branch below so a crit rolled during a sale just multiplies this payout
    // (see CRIT_TIER_CONFIG's saleMultiplier) rather than stacking free upgrades.
    // Tier-aware (mega/ultra get their own bigger multiplier + celebration, not
    // just a flat crit-sized bump) via the same triggerCritCelebration every
    // upgrade-click crit uses
    if (isSaleActive(floor, Date.now())) {
      const tier = getCritTier(floor);
      if (tier) consumeCritUpgrade(floor);
      paySaleClick(
        floor,
        isGroundFloor,
        tier ? CRIT_TIER_CONFIG[tier].multiplier : 1,
      );
      // re-arm the next crit for AFTER this sale ends without letting it also
      // roll a piggyback proc while a special event is already active (see
      // shared/critTypes' rollCrit's own allowSpecialProcs param)
      rollCritUpgrade(floor, false);
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      if (tier) triggerCritCelebration(floor, tier, getScreenCenterLocal);
      return;
    }
    // "Work overtime" boost (see hud/boostMenu.ts's buyOvertimeBoost): free clicks
    // that add ticks to this floor's own overtime gauge (drawn by incomePanel.ts
    // in place of its normal fill-cycle bar) instead of paying out anything. A
    // crit rolled during the event scales the ticks a click adds by that tier's
    // own multiplier (5/25/125), same tier-aware celebration treatment as Sale
    if (isOvertimeActive(floor, Date.now())) {
      const tier = getCritTier(floor);
      if (tier) consumeCritUpgrade(floor);
      const ticks = tier ? CRIT_TIER_CONFIG[tier].multiplier : 1;
      const ticksBefore = getOvertimeTicks(floor);
      addOvertimeTicks(floor, ticks);
      const ticksAdded = getOvertimeTicks(floor) - ticksBefore;
      // re-arm the next crit for AFTER this overtime run ends without
      // letting it also roll a piggyback proc while a special event is
      // already active (see shared/critTypes' rollCrit's own
      // allowSpecialProcs param)
      rollCritUpgrade(floor, false);
      // filling the gauge all the way promotes this floor's own PERMANENT crit
      // tier one step (null -> crit -> mega -> ultra, capped at ultra) and ends
      // the event once the gauge is filled — only
      // fires the instant it crosses the goal, not on every click while already
      // maxed, so a long drain-tail re-trigger chain can't over-promote past ultra
      let goalReached = false;
      const goal = getOvertimeTickGoal(floor);
      if (getOvertimeTicks(floor) >= goal) {
        goalReached = true;
        floor.overtimeGoal = goal;
        const previousTier = floor.critMultiplierTier;
        const promotedTier = nextCritTier(previousTier);
        if (promotedTier !== previousTier) {
          const base = computeBaseFloorStats(
            floors.indexOf(floor) + 1,
            multiplier,
          );
          const upgradeIncome = multiply(floor.rateStep, floor.upgradeCount);
          const previousMultiplier = previousTier
            ? CRIT_TIER_CONFIG[previousTier].multiplier
            : 1;
          const bonusIncome = subtract(
            floor.incomeAmount,
            add(base.incomeAmount, multiply(upgradeIncome, previousMultiplier)),
          );
          floor.incomeAmount = add(
            add(
              base.incomeAmount,
              multiply(
                upgradeIncome,
                CRIT_TIER_CONFIG[promotedTier].multiplier,
              ),
            ),
            bonusIncome,
          );
          floor.critMultiplierTier = promotedTier;
        }
        endOvertimeActiveWindow(floor, Date.now());
        clearOvertimeTickDelivery(floor);
      }
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      if (goalReached) {
        // revealed as the bar jumps (see announceEventEnded)
        triggerCritCelebration(
          floor,
          floor.critMultiplierTier!,
          getScreenCenterLocal,
        );
      } else if (tier) {
        triggerCritCelebration(floor, tier, getScreenCenterLocal);
      }
      const center = getButtonCenter(isGroundFloor);
      const jitterX = (Math.random() - 0.5) * (BTN_W * 0.75);
      const jitterY = (Math.random() - 0.5) * (BTN_H / 2);
      if (goalReached || ticksAdded <= 0) {
        spawnCoinBurst(floor, center.x + jitterX, center.y + jitterY, () => {});
      } else {
        spawnOvertimeCoins(
          floor,
          center.x + jitterX,
          center.y + jitterY,
          isGroundFloor,
          ticksAdded,
        );
      }
      return;
    }
    // "Snowball" is no longer a timed click event (see shared/critTypes'
    // applySnowballCrit) — it's now a flat, instant reward applied straight
    // from the crit-consumption branches below, so there's no click branch
    // here anymore.
    // "Frozen" (see shared/critTypes' isFrozenCrit) is likewise no longer a
    // special click branch — it just locks this floor's own upgradeCost from
    // growing for FROZEN_DURATION_MS (see incomePanel.ts's increaseIncomeRate),
    // so a click here falls straight through to the normal crit/paid-upgrade
    // branches below, at whatever price is currently frozen
    // the slot-machine jackpot moment: free, costs nothing, applies that tier's
    // upgrade count at once, and celebrates with the same shake/flash/sfx/bursts
    // treatment as any other crit (see triggerCritCelebration) — mega/ultra are
    // the rarer, bigger-payout tiers (see upgradeButton.ts's rollCritUpgrade).
    // A "chain crit" (see isChainCrit) additionally extends this same tier's
    // upgrade count up through the building, and a "boost crit" (see
    // isBoostCrit) additionally free-activates this floor's own workers —
    // neither ever changes the button's own pre-click appearance, both only
    // read the flag right here, at the moment the already-armed tier is spent
    if (isFloorMaxed(floor)) return;
    if (isCritUpgrade(floor)) {
      const tier = getCritTier(floor)!;
      const procs = readCritProcs(floor);
      const bonusTier = getBonusTierCrit(floor);
      const eventContext = eventProcContext(deps, isGroundFloor);
      const cover = getClaimedEventCover(floor);
      const carriesEvent = takeClaimedEventProc(floor);
      consumeCritUpgrade(floor);
      // rolled before the rewards so a Golden/Silver Ticket arms the roll after this one
      rollCritUpgrade(floor, true, eventContext);
      // an event covering this crit reveals and pays its tier once it plays out
      const covered =
        carriesEvent &&
        cover !== null &&
        armTakenEventProc(floor, { ...eventContext, critTier: tier });
      if (covered) {
        triggerButtonPress(floor);
      } else {
        applyFloorCrit(deps, floor, Object.assign(procs, { tier, bonusTier }));
        // the special event this crit carried instead of a special crit
        if (carriesEvent && !cover) armTakenEventProc(floor, eventContext);
      }
      // after the celebration, not before: Deja Vu grants its follow-up procs'
      // rewards synchronously from in there, and they'd otherwise miss this save
      persist();
      return;
    }
    if (spendTotalIncome(getUpgradeCost(floor))) {
      applyUpgradeTick(floor, isGroundFloor, true);
      rollCritUpgrade(floor, true, eventProcContext(deps, isGroundFloor));
      persist();
      triggerButtonPress(floor);
      playCoinDrop();
      return;
    }
  }

  // a click on overlapping cats hits every one of them, not just the frontmost
  for (const workerIndex of hitTestWorkers(x, y, floor)) {
    // Date.now()-based (not performance.now()) so it matches drawWorker's
    // Date.now()-based `now`, which is what clickedAt actually gets compared
    // against to time the click-bounce/jump-sprite reaction
    if (!clickWorker(floor, workerIndex, Date.now())) continue;
    playBloop();
    // clicking a worker only (re)activates that specific worker's boost/15s timer.
    // Date.now()-based (not performance.now()) so it matches incomePanel.ts's
    // persisted, Date.now()-based cycle tracking that reads the same boost state
    activateBoosted(floor, workerIndex, Date.now());
    persist();
  }
}
