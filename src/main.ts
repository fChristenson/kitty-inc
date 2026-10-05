// first: every module's Date.now() reads the game clock
import "./shared/gameClock";
import "./style.css";
import { forceTestCrit } from "./floors";
import { wireCritTestActions } from "./hud";
import {
  add,
  subtract,
  fromNumber,
  gt,
  gte,
  isZero,
  ZERO,
  type BigNumber,
} from "./shared/bigNumber";
import {
  CHAIN_CRIT_CONTINUE_CHANCE,
  nextCritTier,
  CRIT_TIER_ORDER,
  CRIT_TIER_CONFIG,
  applyCritProcs,
  POKER_HAND_CRIT_COUNTS,
  LUCKY_CLOVER_CRIT_COUNT,
  LUCKY_CLOVER_CRIT_TIER,
  MYSTIC_UPGRADE_COUNT,
  type CritRollResult,
} from "./shared/critTypes";
import {
  loadFloorBackgrounds,
  loadGroundImage,
  loadWorkerSprite,
  loadCoinImage,
  loadFloatingCoinImage,
  startIncomeTicker,
  ensureLockedFloorAbove,
  getUniformCritTier,
  unlockAllFloors,
  getActiveBackgrounds,
  applyChainCrit,
  increaseIncomeRate,
  currentIncomeRatePerSecond,
  applyBoostAll,
  MAX_RENDERED_WORKERS,
  MAX_FLOORS_PER_BUILDING,
  FLOOR_W,
  FLOOR_H,
  performAutomatedUpgradeClick,
  performAutomatedUpgradeAfterPayment,
  performAutomatedFloorUnlock,
  getCritTier,
  getUpgradeCost,
  rollFloorBuyCrit,
  forceBoostEvent,
  forceUnionEvent,
  forceKickbackEvent,
  forceBurstEvent,
  forceSprayEvent,
  forceFountainEvent,
  forceRippleEvent,
  forceWreckingBallEvent,
  forcePiledriverEvent,
  forceOrbitalStrikeEvent,
  forceFuseEvent,
  forceSupernovaEvent,
  forceBowlingEvent,
  forceThunderclapEvent,
  forceChainReactionEvent,
  forceBullseyeEvent,
  forcePopcornEvent,
  forceNewtonsCradleEvent,
  forceJuggleEvent,
  forceBoomerangEvent,
  forceHeartbeatEvent,
  forceClashEvent,
  forceAsteroidsEvent,
  forceWhackAMoleEvent,
  forceDrumrollEvent,
  forceShellGameEvent,
  forceSeesawEvent,
  forceScratchEvent,
  forceTagEvent,
  forceBumpersEvent,
  forceCatcherEvent,
  forceImplosionEvent,
  forceAtomEvent,
  forceSpiralEvent,
  forceLoopEvent,
  forceEternityEvent,
  forceHelixEvent,
  forceYoYoEvent,
  forceRacetrackEvent,
  forceSwingEvent,
  forceKaleidoscopeEvent,
  forceZipperEvent,
  forceScreensaverEvent,
  forceSprinklerEvent,
  forceClockworkEvent,
  forceHoleInOneEvent,
  forceLeapfrogEvent,
  forceLineupEvent,
  forceStampedeEvent,
  forceWormholeEvent,
  forceSplatEvent,
  forceRouletteEvent,
  forceFreeKickEvent,
  forceSlalomEvent,
  forceLightningEvent,
  forceFireHoseEvent,
  forceConfluenceEvent,
  forceSloshEvent,
  forceSiphonEvent,
  forceCrossfireEvent,
  forceGravityWellEvent,
  forceSplashdownEvent,
  forceGeysersEvent,
  forceCashCannonEvent,
  forceHooverEvent,
  forceAirShowEvent,
  forceLeakEvent,
  forceClimbEvent,
  forceKiteEvent,
  forceRainbowEvent,
  forceBranchesEvent,
  forceTugOfWarEvent,
  forceWaterwheelEvent,
  forceBraidEvent,
  forceSkimEvent,
  forceLatticeEvent,
  forceFireworksEvent,
  forceSlingshotEvent,
  forceMarqueeEvent,
  forceCropDusterEvent,
  forceBolasEvent,
  forceCountdownEvent,
  forceSparklerEvent,
  forceSlinkyEvent,
  forcePipelineEvent,
  forcePrismEvent,
  forceTrampolineEvent,
  forceHummingbirdEvent,
  forceDiveBombEvent,
  forceSkiJumpEvent,
  forceJetpackEvent,
  forceBassDropEvent,
  forceScannerEvent,
  forceLaserGridEvent,
  forceEtchEvent,
  forceSearchlightsEvent,
  forceTractorBeamEvent,
  forceBeamClashEvent,
  forceButterflyEvent,
  forceKelpEvent,
  forcePendulumWaveEvent,
  forceFormationEvent,
  forceOuroborosEvent,
  forceBowstringEvent,
  forceSuperlaserEvent,
  forceIonStormEvent,
  forceGlitchEvent,
  forceMagnifierEvent,
  forceWaterShowEvent,
  forceMercuryEvent,
  forceAlignmentEvent,
  forceDandelionEvent,
  forceBobberEvent,
  forceFishingEvent,
  forceScissorsEvent,
  forcePulseRifleEvent,
  forceSplitEvent,
  forcePixelateEvent,
  forceDamBurstEvent,
  forceSpiderwebEvent,
  forceCurtainEvent,
  forceJellyfishEvent,
  forcePolarityEvent,
  forceColliderEvent,
  forceSheepdogEvent,
  forceDragonEvent,
  forceReflectorEvent,
  forceCookieCutterEvent,
  forceCinematicEvent,
  forceNegativeEvent,
  forceChainLightningEvent,
  forceLockOnEvent,
  forceStitchEvent,
  forceStockpileEvent,
  forceSpotWeldEvent,
  forceReelsEvent,
  forceCashShowerEvent,
  forceCatherineWheelEvent,
  forceMultiballEvent,
  forceWhipEvent,
  forceBatteryEvent,
  forceTeslaCoilEvent,
  forceJacobsLadderEvent,
  forceComicBookEvent,
  forceAvalancheEvent,
  forceBeehiveEvent,
  forcePogoEvent,
  forceLaserHarpEvent,
  forceLichtenbergEvent,
  forceShatterEvent,
  forceFunnelEvent,
  forceGrappleEvent,
  forceSurfEvent,
  forceLaserTagEvent,
  forceBallLightningEvent,
  forceEventHorizonEvent,
  forceTileFlipEvent,
  forceGusherEvent,
  forcePinataEvent,
  forceGiftWrapEvent,
  forceTriangulateEvent,
  forceSparkOfLifeEvent,
  forceGlassRainEvent,
  forceFoldEvent,
  forceCocoonEvent,
  forceGravityAssistEvent,
  forceZipLineEvent,
  forceBreachEvent,
  forceStormSurgeEvent,
  forceSmashAndGrabEvent,
  forceShrinkRayEvent,
  forceSandstormEvent,
  forceJuggernautEvent,
  forceFuelLineEvent,
  forceCheckoutEvent,
  forceLightningRodEvent,
  forceFlagEvent,
  forceTerracesEvent,
  forceBatteringRamEvent,
  forceTetherballEvent,
  forceProjectorEvent,
  forceClearEvent,
  forceInfinityMirrorEvent,
  forceElevatorEvent,
  forceMigrationEvent,
  forceCorkscrewEvent,
  forceMirrorBallEvent,
  forcePlasmaGlobeEvent,
  forceJellyEvent,
  forceShockwaveEvent,
  forcePassTheParcelEvent,
  forceGardenHoseEvent,
  forceBurningGlassEvent,
  forceStormFrontEvent,
  forceSlidePuzzleEvent,
  forceWhirlpoolEvent,
  forceSatellitesEvent,
  forceTypewriterEvent,
  forceRailgunEvent,
  forceThunderdomeEvent,
  forceMeltEvent,
  forceFloodEvent,
  forcePiedPiperEvent,
  forceTentaclesEvent,
  forceLaserPendulumEvent,
  forceElectricEelEvent,
  forceDoubleVisionEvent,
  forceHoneyEvent,
  forceMusicalChairsEvent,
  forceBubbleWandEvent,
  forceHyperspaceEvent,
  forceJavelinEvent,
  forceShuffleEvent,
  forceMushroomCloudEvent,
  forceRelayEvent,
  forceLaserPointerEvent,
  forceStormChaserEvent,
  forceBaitBallEvent,
  forceVideoWallEvent,
  forceFerrofluidEvent,
  forceHideAndSeekEvent,
  forceMagicCarpetEvent,
  forceSpirographEvent,
  forceElectricNetEvent,
  forceDemolitionEvent,
  forceShootingGalleryEvent,
  forceCollapseEvent,
  forceVolcanoEvent,
  forceSkydiversEvent,
  forceSpeedboatEvent,
  forcePeacockEvent,
  forceStormWingsEvent,
  forceClusterBombEvent,
  forceStrafingRunEvent,
  forceStainedGlassEvent,
  forceUprisingEvent,
  forceSwingRideEvent,
  forceLawnmowerEvent,
  forceLightShowEvent,
  forceBugZapperEvent,
  forceFirecrackersEvent,
  forceSixShooterEvent,
  forceThermalEvent,
  forceStalactitesEvent,
  forceKintsugiEvent,
  forceGalaxyEvent,
  forceSnowdriftEvent,
  forceSnowballEvent,
  forceCartwheelEvent,
  forceMatryoshkaEvent,
  forceSalmonRunEvent,
  forceMoonTideEvent,
  forceCandyFlossEvent,
  forceFigureSkaterEvent,
  forceTripwireEvent,
  forceSunriseEvent,
  forceRallyEvent,
  forceIgnitionEvent,
  forceTridentEvent,
  forceCrawlEvent,
  forceCarpetBombingEvent,
  forceTimeBombEvent,
  forceBunkerBusterEvent,
  forceGrenadeTossEvent,
  forceDepthChargesEvent,
  forceFiringSquadEvent,
  forceAkimboEvent,
  forceFlakBarrageEvent,
  forceSniperNestEvent,
  forceRewindEvent,
  forceMorseCodeEvent,
  forceStadiumWaveEvent,
  forceKnightsTourEvent,
  forceLavaLampEvent,
  forceDominoesEvent,
  forceInkblotEvent,
  forceSoftServeEvent,
  forceDollarSignEvent,
  forceMobiusEvent,
  forceSwissRollEvent,
  forceDodgeballEvent,
  forceCongaLineEvent,
  forceSpinningTopEvent,
  forceGobblerEvent,
  forceMajoretteEvent,
  forceHulaHoopEvent,
  forceCalligraphyEvent,
  forceSnakeCharmerEvent,
  forcePlateSpinnerEvent,
  forceFerrisWheelEvent,
  forceBucketBrigadeEvent,
  forceSkyLanternsEvent,
  forceEngraverEvent,
  forceXRayEvent,
  forceLaserLassoEvent,
  forceHexRingEvent,
  forcePortcullisEvent,
  forceKeyholeEvent,
  forceDefibrillatorEvent,
  forceCircuitBoardEvent,
  forceMjolnirEvent,
  forceArcFlashEvent,
  forceFourCornersEvent,
  forceBoltWheelEvent,
  forceMinefieldEvent,
  forceCannonadeEvent,
  forceStickyBombsEvent,
  forceCrossblastEvent,
  forceMortarEvent,
  forceFlashbangEvent,
  forceSentryTurretEvent,
  forceShotgunEvent,
  forceBossFightEvent,
  forceGunshipEvent,
  forceBulletTimeEvent,
  forceFlechettesEvent,
  forceRadarEvent,
  forceBingoEvent,
  forceLaneHopperEvent,
  forceSimonSaysEvent,
  forceEqualizerEvent,
  forceLoadingBarEvent,
  forceDiceRollEvent,
  forceMandalaEvent,
  forceZenGardenEvent,
  forceAccordionEvent,
  forceFizzEvent,
  forceSoundwaveEvent,
  forceTaffyEvent,
  forceDripPaintingEvent,
  forceMothsEvent,
  forceCurlingEvent,
  forceClotheslineEvent,
  forceBalloonPopEvent,
  forceSpinBottleEvent,
  forceSkyWriterEvent,
  forceGoldPanEvent,
  forceBulldozerEvent,
  forceKoiPondEvent,
  forcePipeOrganEvent,
  forceAntTrailEvent,
  forceHotAirBalloonEvent,
  forceLensFlareEvent,
  forceTightropeEvent,
  forceNeonSignEvent,
  forceLightCageEvent,
  forceStairwayEvent,
  forceBeaconsEvent,
  forceAnvilCrawlerEvent,
  forceNeuronsEvent,
  forceBottledBoltEvent,
  forceThunderbirdEvent,
  forceSparkGapEvent,
  forceStaticShockEvent,
  forceRocketJumpEvent,
  forceTorpedoesEvent,
  forceAirstrikeEvent,
  forceDambusterEvent,
  forceAirburstEvent,
  forceBombPinwheelEvent,
  forceBulletCurtainEvent,
  forceTrickShotEvent,
  forceRailShooterEvent,
  forceSkeetShootEvent,
  forceTripleTapEvent,
  forceTommyGunEvent,
  forceSweeperEvent,
  forceClawMachineEvent,
  forceLotteryEvent,
  forceWordGuessEvent,
  forceMemoryMatchEvent,
  forceTicTacToeEvent,
  forceRevCounterEvent,
  forceSluiceEvent,
  forceFoundryEvent,
  forceJetStreamEvent,
  forceMoatEvent,
  forceSeepEvent,
  forceMeanderEvent,
  forceWaltzEvent,
  forceGyroscopeEvent,
  forceDragonflyEvent,
  forceRingTossEvent,
  forceSlipstreamEvent,
  forceSheetMusicEvent,
  forceLeafBlowerEvent,
  forceLoomEvent,
  forceHighDiveEvent,
  forceSowerEvent,
  forceCourierEvent,
  forceRodeoEvent,
  forceCrosshairEvent,
  forceIrisEvent,
  forceBankShotEvent,
  forceSunbeamsEvent,
  forceStargateEvent,
  forceCatsCradleEvent,
  forceThunderheadEvent,
  forcePitchforkEvent,
  forceJumperCablesEvent,
  forceLashEvent,
  forceSparkPlugEvent,
  forceLiveWireEvent,
  forceFuseRaceEvent,
  forceBouncingBettyEvent,
  forcePressureCookerEvent,
  forceHotPotatoEvent,
  forceDaisyChainEvent,
  forceShapedChargeEvent,
  forceDetcordEvent,
  forceBulletBloomEvent,
  forceHighNoonEvent,
  forceHailfireEvent,
  forceDervishEvent,
  forceInvadersEvent,
  forceGunKataEvent,
  forceLockbusterEvent,
  forceConnectFourEvent,
  forceComboEvent,
  forceSkeeBallEvent,
  forceBubbleShooterEvent,
  forceDeltaEvent,
  forceHydrantEvent,
  forceCloverleafEvent,
  forcePinstripeEvent,
  forceFaucetEvent,
  forceShowerheadEvent,
  forceBinaryStarEvent,
  forceHopscotchEvent,
  forceTadpolesEvent,
  forceBlinkEvent,
  forceBumperCarsEvent,
  forcePigeonsEvent,
  forceSquidEvent,
  forceWaterPistolEvent,
  forcePoiEvent,
  forceBartenderEvent,
  forcePoleVaultEvent,
  forcePaintRollerEvent,
  forceBuzzsawEvent,
  forceLightCyclesEvent,
  forceFiberOpticEvent,
  forceDaddyLonglegsEvent,
  forceKnighthoodEvent,
  forceCuttingTorchEvent,
  forceStElmosFireEvent,
  forceSteppedLeaderEvent,
  forceTrolleyEvent,
  forceBoltBounceEvent,
  forceStormCrownEvent,
  forceVanDeGraaffEvent,
  forceBarrelRollEvent,
  forceBombStackEvent,
  forceRomanCandleEvent,
  forceWhistlersEvent,
  forceTrebuchetEvent,
  forceDropPodsEvent,
  forceBombCarouselEvent,
  forceLastStandEvent,
  forceTinCanEvent,
  forcePointDefenseEvent,
  forceTargetPracticeEvent,
  forceFlareGunEvent,
  forceRappelEvent,
  forceStackerEvent,
  forceCoinPusherEvent,
  forceHighStrikerEvent,
  forceNoteHighwayEvent,
  forceSafecrackerEvent,
  forceGumballMachineEvent,
  forceNinjaEvent,
  forceBungeeEvent,
  forceFunnelCakeEvent,
  forceChrysanthemumEvent,
  forceCrossroadsEvent,
  forceWaterslideEvent,
  forceBannerEvent,
  forceHauntEvent,
  forceMapleSeedsEvent,
  forceDonutsEvent,
  forceHamsterWheelEvent,
  forceLunarLanderEvent,
  forceDowsingEvent,
  forceMatadorEvent,
  forceFlashFloodEvent,
  forceDolphinEvent,
  forcePufferEvent,
  forceHockeyStopEvent,
  forceTwirlEvent,
  forceWhaleEvent,
  forceLightPaintingEvent,
  forceSaberThrowEvent,
  forceLaserMazeEvent,
  forceTapeMeasureEvent,
  forcePulsarEvent,
  forceShortCircuitEvent,
  forceConductorEvent,
  forceDoubleStrikeEvent,
  forceLightningFenceEvent,
  forceHeatLightningEvent,
  forcePowderKegsEvent,
  forceBombFountainEvent,
  forceFragOutEvent,
  forceFaultLineEvent,
  forceWillowShellsEvent,
  forceSwarmStrikeEvent,
  forceConcentricEvent,
  forceGrazeEvent,
  forceHotfootEvent,
  forceDogfightEvent,
  forceBulletRoseEvent,
  forceArmorPiercerEvent,
  forceSpotterEvent,
  forcePegSolitaireEvent,
  forceMarbleDropEvent,
  forceStatuesEvent,
  forceFlappyWispEvent,
  forceBuriedTreasureEvent,
  forceAirHockeyEvent,
  forceBoltOfCashEvent,
  forcePendulumPourEvent,
  forcePopTheCorkEvent,
  forceWallJumpEvent,
  forceSuperballEvent,
  forceSpinDashEvent,
  forceCupidEvent,
  forceStorkEvent,
  forcePaperPlaneEvent,
  forceSpikeEvent,
  forceToasterEvent,
  forceXylophoneEvent,
  forceBirthdayCandlesEvent,
  forceDropTowerEvent,
  forceArrowVolleyEvent,
  forceMakeAWishEvent,
  forceBlunderbussEvent,
  forceGenieEvent,
  forceSolarFlareEvent,
  forceHeatVisionEvent,
  forcePrintHeadEvent,
  forceAuroraEvent,
  forceThunderRingsEvent,
  forceArcWeldEvent,
  forceStormKiteEvent,
  forceVolcanicLightningEvent,
  forceSculptorEvent,
  forceGrandFinaleEvent,
  forceBombBouquetEvent,
  forceCascadeEvent,
  forcePinballBombEvent,
  forceBombTrainEvent,
  forceBreachingChargeEvent,
  forceConfettiCannonEvent,
  forceAmmoBeltEvent,
  forceGauntletEvent,
  forceTurretTowerEvent,
  forceShellCasingsEvent,
  forceDartsEvent,
  forceBattleshipEvent,
  forceInterceptorsEvent,
  forceLandGrabEvent,
  forceDuckDuckGooseEvent,
  forceRingerEvent,
  forceHurdlesEvent,
  forceLuckyRollEvent,
  forceCashRegisterEvent,
  forceHorseRaceEvent,
  forceDunkTankEvent,
  forceHalfPipeEvent,
  forceKnotEvent,
  forceTickerTapeEvent,
  forceCashBridgeEvent,
  forceSkippingStoneEvent,
  forceWoodpeckerEvent,
  forceFrisbeeEvent,
  forceKangarooEvent,
  forceBadmintonEvent,
  forceTumbleweedEvent,
  forceShuttleRunEvent,
  forceEcholocationEvent,
  forceLacrosseEvent,
  forceJetSkiEvent,
  forceDrinkingStrawEvent,
  forceSeaSerpentEvent,
  forceMagicTrickEvent,
  forceFountainPenEvent,
  forceSpoolEvent,
  forceLaserRainEvent,
  forceCrossCutEvent,
  forceHeliographEvent,
  forceStarburstEvent,
  forceThunderDrumEvent,
  forceBoltBarrageEvent,
  forceCoilgunEvent,
  forceSnowflakeEvent,
  forceBombSnakeEvent,
  forceSpiderMinesEvent,
  forceCrossetteEvent,
  forceSpiralChargeEvent,
  forceBombBubblesEvent,
  forceRocketSledEvent,
  forceDynamiteFishingEvent,
  forceChargeShotEvent,
  forceCorkscrewRoundsEvent,
  forceOrbitalGunsEvent,
  forceTracerRoundsEvent,
  forcePelletStormEvent,
  forceBulletSnakeEvent,
  forceRockPaperScissorsEvent,
  forceLimboEvent,
  forceQuizShowEvent,
  forceSumoEvent,
  forcePaperTossEvent,
  forceArmWrestlingEvent,
  forceKeepyUppyEvent,
  forcePinTheTailEvent,
  forceTrustFallEvent,
  forceBubbleGumEvent,
  forceCanalLocksEvent,
  forceBobsledEvent,
  forceSpringLoadedEvent,
  forceInfluxEvent,
  forceUnevenBarsEvent,
  forceBumblebeeEvent,
  forceShotPutEvent,
  forceHumanCannonballEvent,
  forceFoxAndHoundsEvent,
  forceKingfisherEvent,
  forceJoustEvent,
  forcePelicanEvent,
  forceDragsterEvent,
  forceFireBreatherEvent,
  forceBucketSwingEvent,
  forcePuppeteerEvent,
  forceCoronaEvent,
  forcePillarsEvent,
  forceLaserLadderEvent,
  forceBeamSplitterEvent,
  forceTeleporterEvent,
  forceRingLightEvent,
  forceTaserEvent,
  forceArcFurnaceEvent,
  forceFiveFingersEvent,
  forceCattleProdEvent,
  forceBoltSlingEvent,
  forceCollidingStormsEvent,
  forceBombJugglerEvent,
  forceBombSquadEvent,
  forceSplitterEvent,
  forceBombPendulumEvent,
  forceParadropEvent,
  forceBombPachinkoEvent,
  forceFuseClockEvent,
  forceHedgehogEvent,
  forceSplitShotEvent,
  forceBulletLassoEvent,
  forceBulletWeaveEvent,
  forceBulletFountainEvent,
  forceCoveringFireEvent,
  forceCheckersEvent,
  forceMinesweeperEvent,
  forceJackInTheBoxEvent,
  forceSpillwayEvent,
  forceCrosscurrentsEvent,
  forceOxbowEvent,
  forceBreakersEvent,
  forceRivuletsEvent,
  forceTorrentEvent,
  forceLissajousEvent,
  forceMoonHopEvent,
  forcePeekabooEvent,
  forceTiltAWhirlEvent,
  forceWaterStriderEvent,
  forceRopeClimbEvent,
  forcePaddleSteamerEvent,
  forceJetWashEvent,
  forceBellowsEvent,
  forceRainDanceEvent,
  forceSkiTowEvent,
  forceRibbonDancerEvent,
  forceLaserTurnstileEvent,
  forceLightBridgeEvent,
  forceLaserWebEvent,
  forceFootlightsEvent,
  forceFusionBeamEvent,
  forcePinpointEvent,
  forceGalvanizeEvent,
  forceSparkJumpEvent,
  forceStaticClingEvent,
  forceCapacitorEvent,
  forceSparkTrainEvent,
  forceArcBridgeEvent,
  forceDaisyCutterEvent,
  forceRippleMinesEvent,
  forceBombYoYoEvent,
  forceBombHailEvent,
  forceGroundPoundEvent,
  forceCherryBombEvent,
  forceBombCrownEvent,
  forceBulletCombEvent,
  forceBulletBraidEvent,
  forceBulletCageEvent,
  forceGunslingerEvent,
  forceBulletWheelEvent,
  forceBulletLadderEvent,
  forceWhipZoomEvent,
  forceIrisOutEvent,
  forceScreenReelsEvent,
  forceGoldLeafEvent,
  forcePixelStormEvent,
  forceGravityFlipEvent,
  forceEchoEvent,
  forceMirrorBoxEvent,
  forcePullBackEvent,
  forceTreadmillEvent,
  forceBlastOffEvent,
  forcePopUpEvent,
  forceStickerPeelEvent,
  forceGlissandoEvent,
  forceVaultDoorsEvent,
  forceChampagneTowerEvent,
  forcePinballRiverEvent,
  forcePressureWasherEvent,
  forceIrrigationEvent,
  forceWaterspoutEvent,
  forceSidewinderEvent,
  forceOrbitSwapEvent,
  forceCuckooEvent,
  forceGyreEvent,
  forceBarHopEvent,
  forceCometPlowEvent,
  forceHoseReelEvent,
  forceGeyserRiderEvent,
  forceBubbleBlowerEvent,
  forcePoolDiveEvent,
  forceRubberBandEvent,
  forceBeamViseEvent,
  forceLaserRakeEvent,
  forceLightDominoesEvent,
  forcePryBarEvent,
  forceTeslaTennisEvent,
  forceTuningForkEvent,
  forceBoltSpiralEvent,
  forceGroundCurrentEvent,
  forceOverchargeEvent,
  forceBombTornadoEvent,
  forceBombBoomerangEvent,
  forceMultistageEvent,
  forceBombPileEvent,
  forceBombGarlandEvent,
  forceHomingRoundsEvent,
  forceWaveCannonEvent,
  forceSnapbackEvent,
  forceBulletFunnelEvent,
  forceCrisscrossEvent,
  forceChainFountainEvent,
  forceSmokeRingsEvent,
  forceWaterSaluteEvent,
  forceDoublePendulumEvent,
  forceTrapezeEvent,
  forceDiaboloEvent,
  forceZorbEvent,
  forceHoopDiveEvent,
  forceSpinArtEvent,
  forcePaperCutterEvent,
  forceFlippersEvent,
  forceDrawbridgeEvent,
  forceFlailEvent,
  forceVineSwingEvent,
  forceBombSnowballEvent,
  forceGerbEvent,
  forceRecoilEvent,
  forceTumbleFireEvent,
  forceRollUpEvent,
  forceShredderEvent,
  forceHeadOnEvent,
  forcePyramidEvent,
  forcePizzaTossEvent,
  forceCompassEvent,
  forceSkewerEvent,
  forceBombCometEvent,
  forceKaboomEvent,
  forceReturnFireEvent,
  forceFrostedGlassEvent,
  forceSwitchOffEvent,
  forceStuntTrackEvent,
  forceFleasEvent,
  forceHandPumpEvent,
  forcePickUpSticksEvent,
  forceThunderShellEvent,
  forceMidAirEvent,
  forceChainFireEvent,
  forceRimShotEvent,
  forceTinRoofEvent,
  forceCrumpleEvent,
  forceMinimizeEvent,
  forceJumpingJetsEvent,
  forceBubbleChamberEvent,
  forceCastNetEvent,
  forceHobermanEvent,
  forceExcaliburEvent,
  forcePistonsEvent,
  forceWilliamTellEvent,
  forceFoosballEvent,
  forceRubberSheetEvent,
  forceRattleEvent,
  forceEddiesEvent,
  forceTubeManEvent,
  forceDeflateEvent,
  forceGearTrainEvent,
  forceUpstrikeEvent,
  forceCreepingBarrageEvent,
  forceBallisticPendulumEvent,
  forceRingTawEvent,
  forceRainyWindowEvent,
  forceInflateEvent,
  forceDomeFountainsEvent,
  forceBellRingersEvent,
  forceWetDogEvent,
  forceTowerCraneEvent,
  forceBeadLightningEvent,
  forceRockslideEvent,
  forceTightGroupEvent,
  forceJacksEvent,
  forceReflectingPoolEvent,
  forcePinArtEvent,
  forceTwinWhirlpoolsEvent,
  forceHatchlingsEvent,
  forceButterfingersEvent,
  forceLockPickEvent,
  forceBlacksmithEvent,
  forceSeismicChargesEvent,
  forceSkipShotsEvent,
  forceJumpingBeansEvent,
  forceSwissCheeseEvent,
  forceExplodedViewEvent,
  forceRiptideEvent,
  forceFencingEvent,
  forceWaterTowerEvent,
  forceBarberPoleEvent,
  forceIonCannonEvent,
  forceClaymoreEvent,
  forcePepperboxEvent,
  forceSquashEvent,
  forceVerticalHoldEvent,
  forceHalftoneEvent,
  forceBlowholeEvent,
  forceLamplighterEvent,
  forceFireBrigadeEvent,
  forceSpokesEvent,
  forceThunderRingEvent,
  forceBottleRocketEvent,
  forceSkeetEvent,
  forceTennisEvent,
  forceInterlaceEvent,
  forceMirrorMirrorEvent,
  forceCottonCandyEvent,
  forcePelotonEvent,
  forceDrinkingBirdEvent,
  forceLaserDrillEvent,
  forceHairRaiserEvent,
  forceDetonatorEvent,
  forceBulletRainEvent,
  forceBouncyCastleEvent,
  forceGameOfLifeEvent,
  forceLabyrinthEvent,
  forceTidalBoreEvent,
  forceScrumEvent,
  forceGoldRushEvent,
  forceSuspensionBridgeEvent,
  forceRedlineEvent,
  forceWillowEvent,
  forceQuickdrawEvent,
  forceGalileanCannonEvent,
  forceChaosGameEvent,
  forceSandpileEvent,
  forceAugerEvent,
  forceFountainShowEvent,
  forceSpinningPlatesEvent,
  forceScoopsEvent,
  forceSolarFurnaceEvent,
  forceLightningHandsEvent,
  forceRingOfFireEvent,
  forceBulletClashEvent,
  forceBouncePassEvent,
  forceOilStrikeEvent,
  forceHarmonographEvent,
  forceQuicksortEvent,
  forceCapillaryEvent,
  forceBattleTopsEvent,
  forcePneumaticTubesEvent,
  forceStarPolygonEvent,
  forceVoltSpiderEvent,
  forceOrbitalDecayEvent,
  forceSprayAndPrayEvent,
  forceShuttleEvent,
  forceDrillDuelEvent,
  forceRule30Event,
  forceAirbrushEvent,
  forceCalvingEvent,
  forcePhoenixEvent,
  forceSteamTrainEvent,
  forceLightSailEvent,
  forceInchwormEvent,
  forceCriticalMassEvent,
  forceKnifeThrowerEvent,
  forceCompactorEvent,
  forceCoreSampleEvent,
  forceFoamPartyEvent,
  forceLangtonsAntEvent,
  forceOthelloEvent,
  forceGloopEvent,
  forceEscapeVelocityEvent,
  forceSungrazerEvent,
  forceFractalTreeEvent,
  forceSwitchboardEvent,
  forceInterferenceEvent,
  forceTowerDefenseEvent,
  forceBounceWaveEvent,
  forceMoleEvent,
  forceCarWashEvent,
  forceDragonCurveEvent,
  forceLightsOutEvent,
  forceTumblerEvent,
  forceWaggleDanceEvent,
  forceWaterCycleEvent,
  forceFoldingRuleEvent,
  forceArcSwarmEvent,
  forceLockstepEvent,
  forceHackySackEvent,
  forceWoodwormEvent,
  forceGraffitiEvent,
  forceVoronoiEvent,
  forcePercolationEvent,
  forceDuneEvent,
  forceStringOfPearlsEvent,
  forceRiverJugglerEvent,
  forceLikeChargesEvent,
  forceCollisionCourseEvent,
  forceTargetWheelEvent,
  forceSpinningHexagonEvent,
  forceBeadDrillEvent,
  forceHydroseederEvent,
  forceMancalaEvent,
  forceBreakthroughEvent,
  forceCurvesEvent,
  forceArchimedesScrewEvent,
  forceMurmurationEvent,
  forceSpiritBombEvent,
  forceMetronomeEvent,
  forcePowerGridEvent,
  forceBombBowlingEvent,
  forceShowdownEvent,
  forceJumpRopeEvent,
  forceStrongboxEvent,
  forceSnowCannonEvent,
  forceHillClimbEvent,
  forceAbacusEvent,
  forceCoralEvent,
  forceChladniEvent,
  forceAfterimageEvent,
  forceSnowGlobeEvent,
  forceSundialEvent,
  forceRiveterEvent,
  forcePaddleBallEvent,
  forceGeodeEvent,
  forceFogMachineEvent,
  forceChicaneEvent,
  forceEpicyclesEvent,
  forceSieveEvent,
  forceClutterEvent,
  forcePartingEvent,
  forceBuzzWireEvent,
  forceHiccupsEvent,
  forceCutTheRopeEvent,
  forceWhisperingGalleryEvent,
  forceChunnelEvent,
  forceSneezeEvent,
  forceGrandPrixEvent,
  forcePillowFightEvent,
  forceDotsAndBoxesEvent,
  forceHoldingPatternEvent,
  forceTankerEvent,
  forceVaporCloudEvent,
  forceShieldBreakerEvent,
  forceBottleneckEvent,
  forceSkylightEvent,
  forceDelugeEvent,
  forceMonacoEvent,
  forceGlitterSpillEvent,
  forceRogueWaveEvent,
  forceThunderEggEvent,
  forceHologramEvent,
  forceLeafFallEvent,
  forceThreeBodyEvent,
  forceSeedPodsEvent,
  forceRippleFireEvent,
  forceSparkChamberEvent,
  forceTurbineEvent,
  forceStrangeAttractorEvent,
  forceTopsyTurvyEvent,
  forceGoldPlatingEvent,
  forceCrosswindEvent,
  forceHailstoneEvent,
  forceHilbertCurveEvent,
  forceLeMansEvent,
  forceTunnelBorerEvent,
  forceHarpoonEvent,
  forceEightQueensEvent,
  forceShortestPathEvent,
  forceSinkholeEvent,
  forceBackwashEvent,
  forceDeflectorEvent,
  forceSunflowerEvent,
  forceConvexHullEvent,
  forceSlashEvent,
  forceJackhammerEvent,
  forcePummelEvent,
  forceOverloadEvent,
  forceGatlingEvent,
  forcePressEvent,
  forceDrillEvent,
  forceBurrowEvent,
  forcePingPongEvent,
  forceSlamDunkEvent,
  forceUppercutEvent,
  forceHeadHopEvent,
  forcePaparazziEvent,
  forceMissileBarrageEvent,
  forceSonicBoomEvent,
  forceMitosisEvent,
  forcePlinkoEvent,
  forceHammerThrowEvent,
  forceSnakeEvent,
  forceBreakoutEvent,
  forceLineClearEvent,
  forceBreakShotEvent,
  forceBulletHellEvent,
  forceVortexEvent,
  forceRicochetEvent,
  forceWaterfallEvent,
  forceConveyorEvent,
  forceFirefliesEvent,
  forcePaydayEvent,
  forcePiggyBankEvent,
  forceCoinTossEvent,
  forceHourglassEvent,
  forceRocketEvent,
  forceRevealEvent,
  forceJackpotReelsEvent,
  forceChainPayEvent,
  forceTwisterEvent,
  forceDownpourEvent,
  forceTrickleEvent,
  forceMagnetEvent,
  forceSpilloverEvent,
  forceConstellationEvent,
  forceAscendEvent,
  forceRisingTideEvent,
  forceTidalWaveEvent,
  forceBeanstalkEvent,
  forceBlessingEvent,
  forceHaloEvent,
  forceCometEvent,
  forceMeteorShowerEvent,
  forceMentorEvent,
  forceSparkChainEvent,
  forcePolishEvent,
  forceLighthouseEvent,
  forceRecruitEvent,
  forcePromotionDayEvent,
  forceAlchemyEvent,
  forceInvestmentEvent,
  forceDividendsEvent,
  forceWispEvent,
  forceStreamEvent,
  forceTrailsEvent,
  forceDrawEvent,
  forceNightSkyEvent,
  forcePitcherEvent,
  forceGlimmerEvent,
  forceHuntEvent,
  startSwarmEvent,
  forceRenovateEvent,
  forceUpgradeEvent,
  forceUnlockEvent,
  type FloorActionsDeps,
} from "./floors";
import {
  startTotalIncomeTicker,
  switchActiveCompany,
  rebalanceDormantCompanyEconomies,
  addTotalIncome,
  spendTotalIncome,
  getTotalIncome,
  getBuildingsCurrentIncomePerSecond,
  getDormantCompaniesIdleIncome,
  withDraftEconomy,
  addCompanyTotalIncome,
} from "./totalIncome";
import {
  saveBuildings,
  saveBuildingsImmediately,
  schedulePersist,
  loadBuildings,
  computeIdleIncome,
  getLastCloseTimestamp,
  IDLE_INCOME_MIN_SECONDS,
  reconcileBoostedAwayIncome,
  markAppClosed,
  initSessionGuard,
  isStorageIntact,
  isFloorMaxed,
  type Floor,
} from "./gameState";
import { bindSaveLifecycle, saveCompanySnapshot } from "./shared/persistence";
import { suppressNativeContextMenu } from "./shared/tapEvents";
import { type BuildingDraft, type RenovationPlan } from "./shared/buildingJob";
import { isDetachedJobPending, isFloorLocked } from "./shared/detachedJob";
import { getCritBadgeOverlay } from "./shared/critBadgeOverlay";
import { createLoadingOverlay } from "./shared/loadingOverlay";
import {
  createRenovationController,
  renovateFloors,
  stopRenovationsNow,
  planRenovation,
  createFixedRenovationPlan,
  createFloorUnlockStep,
  createBuildingCompletionStep,
} from "./renovation";
import {
  getActiveCompanyIndex,
  setActiveCompanyIndex,
  companyStorageKey,
  saveCompanyRecord,
} from "./company";
import {
  createTestButtonMarkup,
  wireTestButton,
  wireSpawnMouseButton,
  wireTestActionsFilter,
  sortTestActionMenus,
  wireIdleOverlayTestButton,
  wireBoostEventTestButton,
  wireUnionEventTestButton,
  wireKickbackEventTestButton,
  wireBurstEventTestButton,
  wireSprayEventTestButton,
  wireFountainEventTestButton,
  wireRippleEventTestButton,
  wireWreckingBallEventTestButton,
  wirePiledriverEventTestButton,
  wireOrbitalStrikeEventTestButton,
  wireFuseEventTestButton,
  wireSupernovaEventTestButton,
  wireBowlingEventTestButton,
  wireThunderclapEventTestButton,
  wireChainReactionEventTestButton,
  wireBullseyeEventTestButton,
  wirePopcornEventTestButton,
  wireNewtonsCradleEventTestButton,
  wireJuggleEventTestButton,
  wireBoomerangEventTestButton,
  wireHeartbeatEventTestButton,
  wireClashEventTestButton,
  wireAsteroidsEventTestButton,
  wireWhackAMoleEventTestButton,
  wireDrumrollEventTestButton,
  wireShellGameEventTestButton,
  wireSeesawEventTestButton,
  wireScratchEventTestButton,
  wireTagEventTestButton,
  wireBumpersEventTestButton,
  wireCatcherEventTestButton,
  wireImplosionEventTestButton,
  wireAtomEventTestButton,
  wireSpiralEventTestButton,
  wireLoopEventTestButton,
  wireEternityEventTestButton,
  wireHelixEventTestButton,
  wireYoYoEventTestButton,
  wireRacetrackEventTestButton,
  wireSwingEventTestButton,
  wireEventTestButtons,
  wireSlashEventTestButton,
  wireJackhammerEventTestButton,
  wirePummelEventTestButton,
  wireOverloadEventTestButton,
  wireGatlingEventTestButton,
  wirePressEventTestButton,
  wireDrillEventTestButton,
  wireBurrowEventTestButton,
  wirePingPongEventTestButton,
  wireSlamDunkEventTestButton,
  wireUppercutEventTestButton,
  wireHeadHopEventTestButton,
  wirePaparazziEventTestButton,
  wireMissileBarrageEventTestButton,
  wireSonicBoomEventTestButton,
  wireMitosisEventTestButton,
  wirePlinkoEventTestButton,
  wireHammerThrowEventTestButton,
  wireSnakeEventTestButton,
  wireBreakoutEventTestButton,
  wireLineClearEventTestButton,
  wireBreakShotEventTestButton,
  wireBulletHellEventTestButton,
  wireVortexEventTestButton,
  wireRicochetEventTestButton,
  wireWaterfallEventTestButton,
  wireConveyorEventTestButton,
  wireFirefliesEventTestButton,
  wirePaydayEventTestButton,
  wirePiggyBankEventTestButton,
  wireCoinTossEventTestButton,
  wireHourglassEventTestButton,
  wireRocketEventTestButton,
  wireRevealEventTestButton,
  wireJackpotReelsEventTestButton,
  wireChainPayEventTestButton,
  wireTwisterEventTestButton,
  wireDownpourEventTestButton,
  wireTrickleEventTestButton,
  wireMagnetEventTestButton,
  wireSpilloverEventTestButton,
  wireConstellationEventTestButton,
  wireAscendEventTestButton,
  wireRisingTideEventTestButton,
  wireTidalWaveEventTestButton,
  wireBeanstalkEventTestButton,
  wireBlessingEventTestButton,
  wireHaloEventTestButton,
  wireCometEventTestButton,
  wireMeteorShowerEventTestButton,
  wireMentorEventTestButton,
  wireSparkChainEventTestButton,
  wirePolishEventTestButton,
  wireLighthouseEventTestButton,
  wireRecruitEventTestButton,
  wirePromotionDayEventTestButton,
  wireAlchemyEventTestButton,
  wireInvestmentEventTestButton,
  wireDividendsEventTestButton,
  wireWispEventTestButton,
  wireStreamEventTestButton,
  wireTrailsEventTestButton,
  wireDrawEventTestButton,
  wireNightSkyEventTestButton,
  wirePitcherEventTestButton,
  wireGlimmerEventTestButton,
  wireHuntEventTestButton,
  wireSwarmEventTestButton,
  wireRenovateEventTestButton,
  wireUpgradeEventTestButton,
  wireUnlockEventTestButton,
  wireResetButton,
  createActionBarMarkup,
  wireActionBar,
  createUpgradeMenuMarkup,
  wireUpgradeMenu,
  createFloorUpgradeMenuMarkup,
  wireFloorUpgradeMenu,
  createCorporationUpgradeMenuMarkup,
  wireCorporationUpgradeMenu,
  createBoostMenuMarkup,
  wireBoostMenu,
  createBadgeCollectionMarkup,
  wireBadgeCollection,
  createCorporationStatsMarkup,
  wireCorporationStats,
  getGlobalIncomeBoostMultiplier,
  getCompanyAssetValue,
  getCompanyUpgradesValue,
  getWorkerCost,
  getOfficeChairsCost,
  getOfficeSuppliesCost,
  getManagerCost,
  buyWorker,
  buyOfficeChairs,
  buyOfficeSupplies,
  buyManager,
  isManagerUnlocked,
  MANAGER_MIN_UPGRADE_COUNT,
  mergeCompanies,
  createMapMenuMarkup,
  wireMapMenu,
  createTotalEarnedOverlayMarkup,
  wireTotalEarnedOverlay,
} from "./hud";
import {
  createGameCanvas,
  loadCityImage,
  loadCloudImages,
  loadCityMapImage,
  createCityMapView,
  createCityMapMarkup,
} from "./background";
import {
  createBuilding,
  configureBuildingFloorPrices,
  getBuildingMultiplier,
  repairZeroedFloors,
  getBuildingPrice,
  loadWallMaterial,
  loadRoofImage,
} from "./buildings";
import { loadMouseImage, forceSpawnMouse } from "./mouse";
import { startBackgroundMusic, preloadSounds, playSwoosh } from "./sound";
import { createNewCorporation } from "./corporationName";
import { observeActionBarHeight } from "./utils";
import { getBackgroundUrls } from "./loadAssets";
import { warmTierFlashes } from "./shared/critFlash";
import { runWhenIdle } from "./shared/idle";
import {
  afterStartup,
  isStartupSettled,
  markStartupSettled,
  whenDocumentReady,
} from "./shared/startupGate";
import { isDialogOpen, isDialogSliding } from "./shared/dialogVisibility";
import { exposePerfBridge } from "./shared/perfBridge";

// matches style.css's worker-menu-slide-out-* keyframes (0.352s) — the company
// select menu's own close animation duration
const DIALOG_CLOSE_MS = 352;
// how far ahead of the dialog fully disappearing the map's own switch-company
// animation should kick in, so the two transitions blend together instead of
// the switch happening while the dialog hasn't even started moving yet
const SWITCH_LEAD_MS = 100;
// Sale and Overtime scroll their floor's button this far down the screen,
// below the middle, nearer a phone user's thumb
const BOOST_BUTTON_SCREEN_SHARE = 0.6;
// a buy-out always ends, even if something keeps being affordable
const BUY_ALL_MAX_PURCHASES = 20_000;

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app not found");
  initSessionGuard();
  suppressNativeContextMenu();
  afterStartup(startBackgroundMusic);
  warmTierFlashes();
  // creating the AudioContext alone blocked the main thread for tens of ms
  runWhenIdle(preloadSounds, 1500);

  app.innerHTML = `
    <div class="game">
      <canvas class="game__canvas" id="game-canvas"></canvas>
      ${createCityMapMarkup()}
      ${createActionBarMarkup()}
      ${import.meta.env.MODE !== "production" ? createTestButtonMarkup() : ""}
    </div>
    ${createUpgradeMenuMarkup()}
    ${createFloorUpgradeMenuMarkup()}
    ${createCorporationUpgradeMenuMarkup()}
    ${createBoostMenuMarkup()}
    ${createBadgeCollectionMarkup()}
    ${createCorporationStatsMarkup()}
    ${createMapMenuMarkup()}
    ${createTotalEarnedOverlayMarkup()}
  `;
  const canvas = app.querySelector<HTMLCanvasElement>("#game-canvas")!;
  const cityMapEl = app.querySelector<HTMLDivElement>("#city-map")!;
  observeActionBarHeight(app.querySelector<HTMLDivElement>("#action-bar")!);

  // canvas text doesn't re-render on its own once a web font finishes loading (unlike
  // DOM text), so every weight the canvas draws with must be loaded before the first
  // redraw below, or the very first frame silently falls back to system-ui
  await Promise.all([
    document.fonts.load('700 16px "Fredoka"'),
    document.fonts.load('900 16px "Fredoka"'),
  ]);

  await Promise.all([
    loadCloudImages(),
    loadMouseImage(),
    loadCoinImage(),
    loadFloatingCoinImage(),
    loadRoofImage(), // same roof art for every theme, loaded once
  ]);

  // one Floor[] per building; only one building is ever shown on screen at a time
  // (see gameCanvas.ts's setActiveFloors) — switching which one is active/visible
  // happens entirely through the map menu below, not by scrolling/swiping.
  // Belongs entirely to whichever corporation is currently active (see
  // company.ts) — switching companies below empties this array and refills it
  // with that other company's own buildings, never mixing the two
  const buildings: Floor[][] = [];
  let activeBuildingIndex = 0;
  let activeCompanyIndex = getActiveCompanyIndex();
  let mapOpen = false;
  const renovationOverlay = createLoadingOverlay(canvas, "Renovating");
  const renovations = createRenovationController({
    setLoading: renovationOverlay.show,
    showRewards: (rewards) => getCritBadgeOverlay().show(rewards),
  });
  function refreshRenovationView(): void {
    renovations.setView(activeCompanyIndex, activeBuildingIndex, mapOpen);
  }
  // consumed once by the very next onSwitchCompany call (see cityMapView's own
  // deps below) — set right before triggering a post-merge switch animation
  // when the OUTGOING company was itself just merged away, so that switch
  // skips re-snapshotting main.ts's own stale live buildings/total over the
  // clear mergeCompanies already did for it
  let skipNextOutgoingSnapshot = false;

  // so a reload lands back on whichever building the player last selected on the
  // map, namespaced per company (see company.ts's companyStorageKey) since each
  // company remembers its own last-active building independently
  const ACTIVE_BUILDING_KEY = "cash-clicker:active-building-index";

  function loadActiveBuildingIndex(companyIndex: number): number {
    try {
      const parsed = Number(
        localStorage.getItem(
          companyStorageKey(ACTIVE_BUILDING_KEY, companyIndex),
        ),
      );
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }

  function saveActiveBuildingIndex(companyIndex: number, index: number): void {
    try {
      localStorage.setItem(
        companyStorageKey(ACTIVE_BUILDING_KEY, companyIndex),
        String(index),
      );
    } catch {
      // storage unavailable: nothing to persist
    }
  }

  function persist() {
    // debounced/idle-scheduled so a click mid-scroll doesn't synchronously serialize
    // every building's floors + hit localStorage on the same frame (see gameState.ts)
    schedulePersist(buildings, activeCompanyIndex);
  }

  function saveCurrentCompanyStateNow(): void {
    saveBuildingsImmediately(buildings, activeCompanyIndex);
    saveCompanySnapshot(
      activeCompanyIndex,
      {
        bankedTotal: getTotalIncome(),
        incomeRatePerSecond: getBuildingsCurrentIncomePerSecond(
          buildings,
          Date.now(),
        ),
        assetValue: getCompanyAssetValue(buildings),
        upgradesValue: getCompanyUpgradesValue(buildings),
      },
      saveCompanyRecord,
    );
  }

  // the full save serializes every building, so a background job's saves wait
  // until its opening hop and coin burst have played
  let companySaveQueued = false;
  function saveCurrentCompanyStateSoon(): void {
    if (companySaveQueued) return;
    companySaveQueued = true;
    setTimeout(
      () =>
        runWhenIdle(() => {
          companySaveQueued = false;
          saveCurrentCompanyStateNow();
        }, 1000),
      1000,
    );
  }

  // loads every asset the game needs (floor backgrounds, ground, wall material,
  // worker/manager sprites) and makes them the active set every draw* function
  // reads from — call before ever showing a building on screen. Roof isn't part
  // of this set (see loadRoofImage, loaded once above).
  async function loadBuildingThemeAssets(): Promise<void> {
    await Promise.all([
      loadFloorBackgrounds(),
      loadGroundImage(),
      loadWallMaterial(),
      loadWorkerSprite(),
    ]);
  }

  // loads a company's saved buildings, or starts it off with a single fresh
  // building if it's never been played before (a brand new corporation, or the
  // very first run)
  async function loadOrCreateBuildings(
    companyIndex: number,
  ): Promise<Floor[][]> {
    const restored = loadBuildings(companyIndex);
    if (restored.length > 0) {
      restored.forEach(repairZeroedFloors);
      return restored;
    }
    const themeBackgroundCount = getBackgroundUrls().length;
    return [createBuilding(0, themeBackgroundCount)];
  }

  buildings.push(...(await loadOrCreateBuildings(activeCompanyIndex)));
  activeBuildingIndex = Math.min(
    Math.max(loadActiveBuildingIndex(activeCompanyIndex), 0),
    buildings.length - 1,
  );
  await loadBuildingThemeAssets();
  await loadCityImage();
  await loadCityMapImage();

  const floorUpgradeMenu = wireFloorUpgradeMenu(app, () => persist());
  const corporationStats = wireCorporationStats(app);

  const gameCanvas = createGameCanvas({
    canvas,
    getBackgrounds: getActiveBackgrounds,
    floors: buildings[activeBuildingIndex],
    getBuildingMultiplier: () => getBuildingMultiplier(activeBuildingIndex),
    getCompanyValue: () => getCompanyAssetValue(buildings),
    applyCompanyWideBoost: () => {
      for (const floors of buildings) {
        applyBoostAll(floors);
      }
    },
    createMysticBuilding: () => createMysticBuilding(),
    persist,
    onOpenFloorUpgrades: (floor, floorNumber) =>
      floorUpgradeMenu.open(floor, floorNumber),
    onOpenCorporationStats: () => corporationStats.open(),
  });

  // ensures a building's next locked floor is waiting above it; onAdd only forwards
  // to gameCanvas.ts when this is the currently-active/on-screen building — an
  // inactive building's newly-added floor gets picked up automatically the next
  // time the player switches to it (setActiveFloors registers every floor fresh).
  function setupBuilding(
    buildingIndex: number,
    targetBuildings = buildings,
  ): void {
    configureBuildingFloorPrices(targetBuildings[buildingIndex], buildingIndex);
    ensureLockedFloorAbove({
      floors: targetBuildings[buildingIndex],
      backgroundCount: getBackgroundUrls().length,
      multiplier: getBuildingMultiplier(buildingIndex),
      onAdd: (floor) => {
        if (
          targetBuildings === buildings &&
          buildingIndex === activeBuildingIndex
        ) {
          gameCanvas.notifyFloorAdded(floor);
        }
      },
    });
  }

  function createMysticBuilding(targetBuildings = buildings): void {
    const mysticBuildingIndex = targetBuildings.length;
    targetBuildings.push(
      createBuilding(mysticBuildingIndex, getBackgroundUrls().length, {
        groundFloorLocked: false,
        initialUpgradeCount: MYSTIC_UPGRADE_COUNT,
      }),
    );
    const groundFloor = targetBuildings[mysticBuildingIndex]?.[0];
    if (groundFloor) {
      setupBuilding(mysticBuildingIndex, targetBuildings);
    }
  }

  function floorActionDeps(
    buildingIndex: number,
    targetBuildings = buildings,
  ): FloorActionsDeps {
    return {
      floors: targetBuildings[buildingIndex],
      backgroundCount: getBackgroundUrls().length,
      multiplier: getBuildingMultiplier(buildingIndex),
      persist: () => {
        if (targetBuildings === buildings) persist();
      },
      onFloorAdded: (floor) => {
        if (
          targetBuildings === buildings &&
          buildingIndex === activeBuildingIndex
        )
          gameCanvas.notifyFloorAdded(floor);
      },
      createMysticBuilding: () => createMysticBuilding(targetBuildings),
      getCompanyValue: () => getCompanyAssetValue(targetBuildings),
      applyCompanyWideBoost: () => {
        for (const floors of targetBuildings) applyBoostAll(floors);
      },
      getScreenCenterLocal: () => ({ x: FLOOR_W / 2, y: FLOOR_H / 2 }),
    };
  }

  // switches which building is currently displayed — no travel animation yet, just
  // an instant cut to the new street.
  async function goToBuilding(buildingIndex: number): Promise<void> {
    activeBuildingIndex = buildingIndex;
    saveActiveBuildingIndex(activeCompanyIndex, buildingIndex);
    await loadBuildingThemeAssets();
    gameCanvas.setActiveFloors(buildings[buildingIndex]);
    refreshRenovationView();
  }

  // switches which corporation is active (see company.ts, cityMap's barrel-roll
  // picker): saves the outgoing company's own buildings/active-building under its
  // own key, then empties+refills the same buildings array reference (every
  // closure above captured this array once, not its contents) with the new
  // company's own separate buildings, its own last-active building, and hands
  // totalIncome.ts its own separate running total — nothing here is shared
  // between companies
  async function switchToCompany(
    companyIndex: number,
    // set by the corporation-merge flow below when the OUTGOING company was
    // itself just merged away (see mergeCompanies) — its storage was already
    // cleared there, so snapshotting main.ts's own now-stale live buildings/
    // total over that clear would silently resurrect it. Every other caller
    // (a normal barrel-roll switch, "Create new Corporation") leaves this off
    skipOutgoingSnapshot = false,
  ): Promise<void> {
    if (!skipOutgoingSnapshot) {
      // snapshot the OUTGOING company's ENTIRE CompanyRecord (see company.ts) in
      // one atomic write, while `buildings`/`activeCompanyIndex`/`totalIncome`
      // still hold its data — bankedTotal, its rate, and the timestamp all land
      // together, so a dormant company's derived total can never desync from a
      // separately-written "just the total" value (there isn't one anymore)
      saveCompanySnapshot(
        activeCompanyIndex,
        {
          bankedTotal: getTotalIncome(),
          incomeRatePerSecond: getBuildingsCurrentIncomePerSecond(
            buildings,
            Date.now(),
          ),
          assetValue: getCompanyAssetValue(buildings),
          upgradesValue: getCompanyUpgradesValue(buildings),
        },
        saveCompanyRecord,
      );
      saveBuildings(buildings, activeCompanyIndex);
      saveActiveBuildingIndex(activeCompanyIndex, activeBuildingIndex);
    }

    activeCompanyIndex = companyIndex;
    setActiveCompanyIndex(companyIndex);
    buildings.length = 0;
    buildings.push(...(await loadOrCreateBuildings(companyIndex)));
    activeBuildingIndex = Math.min(
      Math.max(loadActiveBuildingIndex(companyIndex), 0),
      buildings.length - 1,
    );
    buildings.forEach((_, i) => setupBuilding(i));

    switchActiveCompany(companyIndex, buildings);
    // tops up whatever collectDueIncome is about to pay any floor whose own
    // worker boost decayed partway through however long this company just sat
    // dormant (see gameState.ts's own doc comment) — must run AFTER
    // switchActiveCompany so the credit lands in the now-active company's total
    const awayBoostIncome = reconcileBoostedAwayIncome(
      buildings,
      currentIncomeRatePerSecond,
    );
    if (gt(awayBoostIncome, fromNumber(0))) addTotalIncome(awayBoostIncome);
    await loadBuildingThemeAssets();
    await Promise.all([loadCityImage(), loadCityMapImage()]);
    gameCanvas.setActiveFloors(buildings[activeBuildingIndex]);
    refreshRenovationView();
  }

  // dev/test-only controls; markup is stripped entirely in production builds
  if (import.meta.env.MODE !== "production") {
    exposePerfBridge({
      getActiveFloors: () => buildings[activeBuildingIndex],
      floorToClient: gameCanvas.floorToClient,
      scrollToFloor: gameCanvas.scrollActiveToFloor,
      wrapRedraw: (wrap) => {
        gameCanvas.redraw = wrap(gameCanvas.redraw);
      },
    });
    wireTestButton(app, () => {
      // absurdly large: comfortably covers buying dozens of buildings in one go,
      // many cities deep (see cityName/cityMap's continuously-compounding
      // BUILDING_COST_MULTIPLIER pricing) — formatCompactNumber's suffix (utils.ts)
      // is generated algorithmically, not from a fixed list, so it never runs out
      // of a name for however big this (or totalIncome) ever gets
      addTotalIncome(fromNumber(1e150));
    });
    wireSpawnMouseButton(app, () => {
      forceSpawnMouse(buildings[activeBuildingIndex] ?? []);
    });
    wireCritTestActions(app, (kind, tier, bonusTier, event) => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (floor) forceTestCrit(floor, kind, tier, bonusTier, event);
    });
    // shows the idle-income "You have earned" overlay (see
    // hud/totalEarnedOverlay) on demand, without needing to actually leave and
    // reopen the tab to earn real idle income first
    wireIdleOverlayTestButton(app, () => {
      void totalEarnedOverlay.show(fromNumber(123456));
    });
    // arms the "Boost!" event button on the lowest floor that still has an
    // un-boosted worker, and scrolls to it
    wireBoostEventTestButton(app, () => {
      const floor = forceBoostEvent(buildings[activeBuildingIndex] ?? []);
      if (floor) gameCanvas.scrollActiveToFloor(floor);
    });
    // arms "Union!" on the lowest floor with workers to merge, and scrolls to it
    wireUnionEventTestButton(app, () => {
      const floor = forceUnionEvent(buildings[activeBuildingIndex] ?? []);
      if (floor) gameCanvas.scrollActiveToFloor(floor);
    });
    // scrolls to the ground floor and arms a crit there carrying Kickback
    wireKickbackEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceKickbackEvent(floor);
    });
    // same, for the Burst event
    wireBurstEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBurstEvent(floor);
    });
    // same, for the Spray event
    wireSprayEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSprayEvent(floor);
    });
    // same, for the Fountain event
    wireFountainEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceFountainEvent(floor);
    });
    // same, for the Ripple event
    wireRippleEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceRippleEvent(floor);
    });
    // same, for the Wrecking Ball event
    wireWreckingBallEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceWreckingBallEvent(floor);
    });
    // same, for the Piledriver event
    wirePiledriverEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePiledriverEvent(floor);
    });
    // same, for the Orbital Strike event
    wireOrbitalStrikeEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceOrbitalStrikeEvent(floor);
    });
    // same, for the Fuse event
    wireFuseEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceFuseEvent(floor);
    });
    // same, for the Supernova event
    wireSupernovaEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSupernovaEvent(floor);
    });
    // same, for the Bowling event
    wireBowlingEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBowlingEvent(floor);
    });
    // same, for the Thunderclap event
    wireThunderclapEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceThunderclapEvent(floor);
    });
    // same, for the Chain Reaction event
    wireChainReactionEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceChainReactionEvent(floor);
    });
    // same, for the Bullseye event
    wireBullseyeEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBullseyeEvent(floor);
    });
    // same, for the Popcorn event
    wirePopcornEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePopcornEvent(floor);
    });
    // same, for the Newton's Cradle event
    wireNewtonsCradleEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceNewtonsCradleEvent(floor);
    });
    // same, for the Juggle event
    wireJuggleEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceJuggleEvent(floor);
    });
    // same, for the Boomerang event
    wireBoomerangEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBoomerangEvent(floor);
    });
    // same, for the Heartbeat event
    wireHeartbeatEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceHeartbeatEvent(floor);
    });
    // same, for the Clash event
    wireClashEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceClashEvent(floor);
    });
    // same, for the Asteroids event
    wireAsteroidsEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceAsteroidsEvent(floor);
    });
    // same, for the Whack-a-Mole event
    wireWhackAMoleEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceWhackAMoleEvent(floor);
    });
    // same, for the Drumroll event
    wireDrumrollEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceDrumrollEvent(floor);
    });
    // same, for the Shell Game event
    wireShellGameEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceShellGameEvent(floor);
    });
    // same, for the Seesaw event
    wireSeesawEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSeesawEvent(floor);
    });
    // same, for the Scratch event
    wireScratchEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceScratchEvent(floor);
    });
    // same, for the Tag event
    wireTagEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceTagEvent(floor);
    });
    // same, for the Bumpers event
    wireBumpersEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBumpersEvent(floor);
    });
    // same, for the Catcher event
    wireCatcherEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceCatcherEvent(floor);
    });
    // same, for the Implosion event
    wireImplosionEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceImplosionEvent(floor);
    });
    // same, for the Atom event
    wireAtomEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceAtomEvent(floor);
    });
    // same, for the Spiral event
    wireSpiralEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSpiralEvent(floor);
    });
    // same, for the Loop event
    wireLoopEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceLoopEvent(floor);
    });
    // same, for the Eternity event
    wireEternityEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceEternityEvent(floor);
    });
    // same, for the Helix event
    wireHelixEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceHelixEvent(floor);
    });
    // same, for the Yo-Yo event
    wireYoYoEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceYoYoEvent(floor);
    });
    // same, for the Racetrack event
    wireRacetrackEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceRacetrackEvent(floor);
    });
    // same, for the Swing event
    wireSwingEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSwingEvent(floor);
    });
    // the rest of the event test buttons, each forcing its event on the
    // active building's ground floor
    const forceOnActive = (force: typeof forceSwingEvent) => () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      force(floor);
    };
    wireEventTestButtons(app, {
      kaleidoscope: forceOnActive(forceKaleidoscopeEvent),
      zipper: forceOnActive(forceZipperEvent),
      screensaver: forceOnActive(forceScreensaverEvent),
      sprinkler: forceOnActive(forceSprinklerEvent),
      clockwork: forceOnActive(forceClockworkEvent),
      "hole-in-one": forceOnActive(forceHoleInOneEvent),
      leapfrog: forceOnActive(forceLeapfrogEvent),
      lineup: forceOnActive(forceLineupEvent),
      stampede: forceOnActive(forceStampedeEvent),
      wormhole: forceOnActive(forceWormholeEvent),
      splat: forceOnActive(forceSplatEvent),
      roulette: forceOnActive(forceRouletteEvent),
      "free-kick": forceOnActive(forceFreeKickEvent),
      slalom: forceOnActive(forceSlalomEvent),
      lightning: forceOnActive(forceLightningEvent),
      "fire-hose": forceOnActive(forceFireHoseEvent),
      confluence: forceOnActive(forceConfluenceEvent),
      slosh: forceOnActive(forceSloshEvent),
      siphon: forceOnActive(forceSiphonEvent),
      crossfire: forceOnActive(forceCrossfireEvent),
      "gravity-well": forceOnActive(forceGravityWellEvent),
      splashdown: forceOnActive(forceSplashdownEvent),
      geysers: forceOnActive(forceGeysersEvent),
      "cash-cannon": forceOnActive(forceCashCannonEvent),
      hoover: forceOnActive(forceHooverEvent),
      "air-show": forceOnActive(forceAirShowEvent),
      leak: forceOnActive(forceLeakEvent),
      climb: forceOnActive(forceClimbEvent),
      kite: forceOnActive(forceKiteEvent),
      rainbow: forceOnActive(forceRainbowEvent),
      branches: forceOnActive(forceBranchesEvent),
      "tug-of-war": forceOnActive(forceTugOfWarEvent),
      waterwheel: forceOnActive(forceWaterwheelEvent),
      braid: forceOnActive(forceBraidEvent),
      skim: forceOnActive(forceSkimEvent),
      lattice: forceOnActive(forceLatticeEvent),
      fireworks: forceOnActive(forceFireworksEvent),
      slingshot: forceOnActive(forceSlingshotEvent),
      marquee: forceOnActive(forceMarqueeEvent),
      "crop-duster": forceOnActive(forceCropDusterEvent),
      bolas: forceOnActive(forceBolasEvent),
      countdown: forceOnActive(forceCountdownEvent),
      sparkler: forceOnActive(forceSparklerEvent),
      slinky: forceOnActive(forceSlinkyEvent),
      pipeline: forceOnActive(forcePipelineEvent),
      prism: forceOnActive(forcePrismEvent),
      trampoline: forceOnActive(forceTrampolineEvent),
      hummingbird: forceOnActive(forceHummingbirdEvent),
      "dive-bomb": forceOnActive(forceDiveBombEvent),
      "ski-jump": forceOnActive(forceSkiJumpEvent),
      jetpack: forceOnActive(forceJetpackEvent),
      "bass-drop": forceOnActive(forceBassDropEvent),
      scanner: forceOnActive(forceScannerEvent),
      "laser-grid": forceOnActive(forceLaserGridEvent),
      etch: forceOnActive(forceEtchEvent),
      searchlights: forceOnActive(forceSearchlightsEvent),
      "tractor-beam": forceOnActive(forceTractorBeamEvent),
      "beam-clash": forceOnActive(forceBeamClashEvent),
      butterfly: forceOnActive(forceButterflyEvent),
      kelp: forceOnActive(forceKelpEvent),
      "pendulum-wave": forceOnActive(forcePendulumWaveEvent),
      formation: forceOnActive(forceFormationEvent),
      ouroboros: forceOnActive(forceOuroborosEvent),
      bowstring: forceOnActive(forceBowstringEvent),
      superlaser: forceOnActive(forceSuperlaserEvent),
      "ion-storm": forceOnActive(forceIonStormEvent),
      glitch: forceOnActive(forceGlitchEvent),
      magnifier: forceOnActive(forceMagnifierEvent),
      "water-show": forceOnActive(forceWaterShowEvent),
      mercury: forceOnActive(forceMercuryEvent),
      alignment: forceOnActive(forceAlignmentEvent),
      dandelion: forceOnActive(forceDandelionEvent),
      bobber: forceOnActive(forceBobberEvent),
      fishing: forceOnActive(forceFishingEvent),
      scissors: forceOnActive(forceScissorsEvent),
      "pulse-rifle": forceOnActive(forcePulseRifleEvent),
      split: forceOnActive(forceSplitEvent),
      pixelate: forceOnActive(forcePixelateEvent),
      "dam-burst": forceOnActive(forceDamBurstEvent),
      spiderweb: forceOnActive(forceSpiderwebEvent),
      curtain: forceOnActive(forceCurtainEvent),
      jellyfish: forceOnActive(forceJellyfishEvent),
      polarity: forceOnActive(forcePolarityEvent),
      collider: forceOnActive(forceColliderEvent),
      sheepdog: forceOnActive(forceSheepdogEvent),
      dragon: forceOnActive(forceDragonEvent),
      reflector: forceOnActive(forceReflectorEvent),
      "cookie-cutter": forceOnActive(forceCookieCutterEvent),
      cinematic: forceOnActive(forceCinematicEvent),
      negative: forceOnActive(forceNegativeEvent),
      "chain-lightning": forceOnActive(forceChainLightningEvent),
      "lock-on": forceOnActive(forceLockOnEvent),
      stitch: forceOnActive(forceStitchEvent),
      stockpile: forceOnActive(forceStockpileEvent),
      "spot-weld": forceOnActive(forceSpotWeldEvent),
      reels: forceOnActive(forceReelsEvent),
      "cash-shower": forceOnActive(forceCashShowerEvent),
      "catherine-wheel": forceOnActive(forceCatherineWheelEvent),
      multiball: forceOnActive(forceMultiballEvent),
      whip: forceOnActive(forceWhipEvent),
      battery: forceOnActive(forceBatteryEvent),
      "tesla-coil": forceOnActive(forceTeslaCoilEvent),
      "jacobs-ladder": forceOnActive(forceJacobsLadderEvent),
      "comic-book": forceOnActive(forceComicBookEvent),
      avalanche: forceOnActive(forceAvalancheEvent),
      beehive: forceOnActive(forceBeehiveEvent),
      pogo: forceOnActive(forcePogoEvent),
      "laser-harp": forceOnActive(forceLaserHarpEvent),
      lichtenberg: forceOnActive(forceLichtenbergEvent),
      shatter: forceOnActive(forceShatterEvent),
      funnel: forceOnActive(forceFunnelEvent),
      grapple: forceOnActive(forceGrappleEvent),
      surf: forceOnActive(forceSurfEvent),
      "laser-tag": forceOnActive(forceLaserTagEvent),
      "ball-lightning": forceOnActive(forceBallLightningEvent),
      "event-horizon": forceOnActive(forceEventHorizonEvent),
      "tile-flip": forceOnActive(forceTileFlipEvent),
      gusher: forceOnActive(forceGusherEvent),
      pinata: forceOnActive(forcePinataEvent),
      "gift-wrap": forceOnActive(forceGiftWrapEvent),
      triangulate: forceOnActive(forceTriangulateEvent),
      "spark-of-life": forceOnActive(forceSparkOfLifeEvent),
      "glass-rain": forceOnActive(forceGlassRainEvent),
      fold: forceOnActive(forceFoldEvent),
      cocoon: forceOnActive(forceCocoonEvent),
      "gravity-assist": forceOnActive(forceGravityAssistEvent),
      "zip-line": forceOnActive(forceZipLineEvent),
      breach: forceOnActive(forceBreachEvent),
      "storm-surge": forceOnActive(forceStormSurgeEvent),
      "smash-and-grab": forceOnActive(forceSmashAndGrabEvent),
      "shrink-ray": forceOnActive(forceShrinkRayEvent),
      sandstorm: forceOnActive(forceSandstormEvent),
      juggernaut: forceOnActive(forceJuggernautEvent),
      "fuel-line": forceOnActive(forceFuelLineEvent),
      checkout: forceOnActive(forceCheckoutEvent),
      "lightning-rod": forceOnActive(forceLightningRodEvent),
      flag: forceOnActive(forceFlagEvent),
      terraces: forceOnActive(forceTerracesEvent),
      "battering-ram": forceOnActive(forceBatteringRamEvent),
      tetherball: forceOnActive(forceTetherballEvent),
      projector: forceOnActive(forceProjectorEvent),
      clear: forceOnActive(forceClearEvent),
      "infinity-mirror": forceOnActive(forceInfinityMirrorEvent),
      elevator: forceOnActive(forceElevatorEvent),
      migration: forceOnActive(forceMigrationEvent),
      corkscrew: forceOnActive(forceCorkscrewEvent),
      "mirror-ball": forceOnActive(forceMirrorBallEvent),
      "plasma-globe": forceOnActive(forcePlasmaGlobeEvent),
      jelly: forceOnActive(forceJellyEvent),
      shockwave: forceOnActive(forceShockwaveEvent),
      "pass-the-parcel": forceOnActive(forcePassTheParcelEvent),
      "garden-hose": forceOnActive(forceGardenHoseEvent),
      "burning-glass": forceOnActive(forceBurningGlassEvent),
      "storm-front": forceOnActive(forceStormFrontEvent),
      "slide-puzzle": forceOnActive(forceSlidePuzzleEvent),
      whirlpool: forceOnActive(forceWhirlpoolEvent),
      satellites: forceOnActive(forceSatellitesEvent),
      typewriter: forceOnActive(forceTypewriterEvent),
      railgun: forceOnActive(forceRailgunEvent),
      thunderdome: forceOnActive(forceThunderdomeEvent),
      melt: forceOnActive(forceMeltEvent),
      flood: forceOnActive(forceFloodEvent),
      "pied-piper": forceOnActive(forcePiedPiperEvent),
      tentacles: forceOnActive(forceTentaclesEvent),
      "laser-pendulum": forceOnActive(forceLaserPendulumEvent),
      "electric-eel": forceOnActive(forceElectricEelEvent),
      "double-vision": forceOnActive(forceDoubleVisionEvent),
      honey: forceOnActive(forceHoneyEvent),
      "musical-chairs": forceOnActive(forceMusicalChairsEvent),
      "bubble-wand": forceOnActive(forceBubbleWandEvent),
      hyperspace: forceOnActive(forceHyperspaceEvent),
      javelin: forceOnActive(forceJavelinEvent),
      shuffle: forceOnActive(forceShuffleEvent),
      "mushroom-cloud": forceOnActive(forceMushroomCloudEvent),
      relay: forceOnActive(forceRelayEvent),
      "laser-pointer": forceOnActive(forceLaserPointerEvent),
      "storm-chaser": forceOnActive(forceStormChaserEvent),
      "bait-ball": forceOnActive(forceBaitBallEvent),
      "video-wall": forceOnActive(forceVideoWallEvent),
      ferrofluid: forceOnActive(forceFerrofluidEvent),
      "hide-and-seek": forceOnActive(forceHideAndSeekEvent),
      "magic-carpet": forceOnActive(forceMagicCarpetEvent),
      spirograph: forceOnActive(forceSpirographEvent),
      "electric-net": forceOnActive(forceElectricNetEvent),
      demolition: forceOnActive(forceDemolitionEvent),
      "shooting-gallery": forceOnActive(forceShootingGalleryEvent),
      collapse: forceOnActive(forceCollapseEvent),
      volcano: forceOnActive(forceVolcanoEvent),
      skydivers: forceOnActive(forceSkydiversEvent),
      speedboat: forceOnActive(forceSpeedboatEvent),
      peacock: forceOnActive(forcePeacockEvent),
      "storm-wings": forceOnActive(forceStormWingsEvent),
      "cluster-bomb": forceOnActive(forceClusterBombEvent),
      "strafing-run": forceOnActive(forceStrafingRunEvent),
      "stained-glass": forceOnActive(forceStainedGlassEvent),
      uprising: forceOnActive(forceUprisingEvent),
      "swing-ride": forceOnActive(forceSwingRideEvent),
      lawnmower: forceOnActive(forceLawnmowerEvent),
      "light-show": forceOnActive(forceLightShowEvent),
      "bug-zapper": forceOnActive(forceBugZapperEvent),
      firecrackers: forceOnActive(forceFirecrackersEvent),
      "six-shooter": forceOnActive(forceSixShooterEvent),
      thermal: forceOnActive(forceThermalEvent),
      stalactites: forceOnActive(forceStalactitesEvent),
      kintsugi: forceOnActive(forceKintsugiEvent),
      galaxy: forceOnActive(forceGalaxyEvent),
      snowdrift: forceOnActive(forceSnowdriftEvent),
      snowball: forceOnActive(forceSnowballEvent),
      cartwheel: forceOnActive(forceCartwheelEvent),
      matryoshka: forceOnActive(forceMatryoshkaEvent),
      "salmon-run": forceOnActive(forceSalmonRunEvent),
      "moon-tide": forceOnActive(forceMoonTideEvent),
      "candy-floss": forceOnActive(forceCandyFlossEvent),
      "figure-skater": forceOnActive(forceFigureSkaterEvent),
      tripwire: forceOnActive(forceTripwireEvent),
      sunrise: forceOnActive(forceSunriseEvent),
      rally: forceOnActive(forceRallyEvent),
      ignition: forceOnActive(forceIgnitionEvent),
      trident: forceOnActive(forceTridentEvent),
      crawl: forceOnActive(forceCrawlEvent),
      "carpet-bombing": forceOnActive(forceCarpetBombingEvent),
      "time-bomb": forceOnActive(forceTimeBombEvent),
      "bunker-buster": forceOnActive(forceBunkerBusterEvent),
      "grenade-toss": forceOnActive(forceGrenadeTossEvent),
      "depth-charges": forceOnActive(forceDepthChargesEvent),
      "firing-squad": forceOnActive(forceFiringSquadEvent),
      akimbo: forceOnActive(forceAkimboEvent),
      "flak-barrage": forceOnActive(forceFlakBarrageEvent),
      "sniper-nest": forceOnActive(forceSniperNestEvent),
      rewind: forceOnActive(forceRewindEvent),
      "morse-code": forceOnActive(forceMorseCodeEvent),
      "stadium-wave": forceOnActive(forceStadiumWaveEvent),
      "knights-tour": forceOnActive(forceKnightsTourEvent),
      "lava-lamp": forceOnActive(forceLavaLampEvent),
      dominoes: forceOnActive(forceDominoesEvent),
      inkblot: forceOnActive(forceInkblotEvent),
      "soft-serve": forceOnActive(forceSoftServeEvent),
      "dollar-sign": forceOnActive(forceDollarSignEvent),
      mobius: forceOnActive(forceMobiusEvent),
      "swiss-roll": forceOnActive(forceSwissRollEvent),
      dodgeball: forceOnActive(forceDodgeballEvent),
      "conga-line": forceOnActive(forceCongaLineEvent),
      "spinning-top": forceOnActive(forceSpinningTopEvent),
      gobbler: forceOnActive(forceGobblerEvent),
      majorette: forceOnActive(forceMajoretteEvent),
      "hula-hoop": forceOnActive(forceHulaHoopEvent),
      calligraphy: forceOnActive(forceCalligraphyEvent),
      "snake-charmer": forceOnActive(forceSnakeCharmerEvent),
      "plate-spinner": forceOnActive(forcePlateSpinnerEvent),
      "ferris-wheel": forceOnActive(forceFerrisWheelEvent),
      "bucket-brigade": forceOnActive(forceBucketBrigadeEvent),
      "sky-lanterns": forceOnActive(forceSkyLanternsEvent),
      engraver: forceOnActive(forceEngraverEvent),
      "x-ray": forceOnActive(forceXRayEvent),
      "laser-lasso": forceOnActive(forceLaserLassoEvent),
      "hex-ring": forceOnActive(forceHexRingEvent),
      portcullis: forceOnActive(forcePortcullisEvent),
      keyhole: forceOnActive(forceKeyholeEvent),
      defibrillator: forceOnActive(forceDefibrillatorEvent),
      "circuit-board": forceOnActive(forceCircuitBoardEvent),
      mjolnir: forceOnActive(forceMjolnirEvent),
      "arc-flash": forceOnActive(forceArcFlashEvent),
      "four-corners": forceOnActive(forceFourCornersEvent),
      "bolt-wheel": forceOnActive(forceBoltWheelEvent),
      minefield: forceOnActive(forceMinefieldEvent),
      cannonade: forceOnActive(forceCannonadeEvent),
      "sticky-bombs": forceOnActive(forceStickyBombsEvent),
      crossblast: forceOnActive(forceCrossblastEvent),
      mortar: forceOnActive(forceMortarEvent),
      flashbang: forceOnActive(forceFlashbangEvent),
      "sentry-turret": forceOnActive(forceSentryTurretEvent),
      shotgun: forceOnActive(forceShotgunEvent),
      "boss-fight": forceOnActive(forceBossFightEvent),
      gunship: forceOnActive(forceGunshipEvent),
      "bullet-time": forceOnActive(forceBulletTimeEvent),
      flechettes: forceOnActive(forceFlechettesEvent),
      radar: forceOnActive(forceRadarEvent),
      bingo: forceOnActive(forceBingoEvent),
      "lane-hopper": forceOnActive(forceLaneHopperEvent),
      "simon-says": forceOnActive(forceSimonSaysEvent),
      equalizer: forceOnActive(forceEqualizerEvent),
      "loading-bar": forceOnActive(forceLoadingBarEvent),
      "dice-roll": forceOnActive(forceDiceRollEvent),
      mandala: forceOnActive(forceMandalaEvent),
      "zen-garden": forceOnActive(forceZenGardenEvent),
      accordion: forceOnActive(forceAccordionEvent),
      fizz: forceOnActive(forceFizzEvent),
      soundwave: forceOnActive(forceSoundwaveEvent),
      taffy: forceOnActive(forceTaffyEvent),
      "drip-painting": forceOnActive(forceDripPaintingEvent),
      moths: forceOnActive(forceMothsEvent),
      curling: forceOnActive(forceCurlingEvent),
      clothesline: forceOnActive(forceClotheslineEvent),
      "balloon-pop": forceOnActive(forceBalloonPopEvent),
      "spin-bottle": forceOnActive(forceSpinBottleEvent),
      "sky-writer": forceOnActive(forceSkyWriterEvent),
      "gold-pan": forceOnActive(forceGoldPanEvent),
      bulldozer: forceOnActive(forceBulldozerEvent),
      "koi-pond": forceOnActive(forceKoiPondEvent),
      "pipe-organ": forceOnActive(forcePipeOrganEvent),
      "ant-trail": forceOnActive(forceAntTrailEvent),
      "hot-air-balloon": forceOnActive(forceHotAirBalloonEvent),
      "lens-flare": forceOnActive(forceLensFlareEvent),
      tightrope: forceOnActive(forceTightropeEvent),
      "neon-sign": forceOnActive(forceNeonSignEvent),
      "light-cage": forceOnActive(forceLightCageEvent),
      stairway: forceOnActive(forceStairwayEvent),
      beacons: forceOnActive(forceBeaconsEvent),
      "anvil-crawler": forceOnActive(forceAnvilCrawlerEvent),
      neurons: forceOnActive(forceNeuronsEvent),
      "bottled-bolt": forceOnActive(forceBottledBoltEvent),
      thunderbird: forceOnActive(forceThunderbirdEvent),
      "spark-gap": forceOnActive(forceSparkGapEvent),
      "static-shock": forceOnActive(forceStaticShockEvent),
      "rocket-jump": forceOnActive(forceRocketJumpEvent),
      torpedoes: forceOnActive(forceTorpedoesEvent),
      airstrike: forceOnActive(forceAirstrikeEvent),
      dambuster: forceOnActive(forceDambusterEvent),
      airburst: forceOnActive(forceAirburstEvent),
      "bomb-pinwheel": forceOnActive(forceBombPinwheelEvent),
      "bullet-curtain": forceOnActive(forceBulletCurtainEvent),
      "trick-shot": forceOnActive(forceTrickShotEvent),
      "rail-shooter": forceOnActive(forceRailShooterEvent),
      "skeet-shoot": forceOnActive(forceSkeetShootEvent),
      "triple-tap": forceOnActive(forceTripleTapEvent),
      "tommy-gun": forceOnActive(forceTommyGunEvent),
      sweeper: forceOnActive(forceSweeperEvent),
      "claw-machine": forceOnActive(forceClawMachineEvent),
      lottery: forceOnActive(forceLotteryEvent),
      "word-guess": forceOnActive(forceWordGuessEvent),
      "memory-match": forceOnActive(forceMemoryMatchEvent),
      "tic-tac-toe": forceOnActive(forceTicTacToeEvent),
      "rev-counter": forceOnActive(forceRevCounterEvent),
      sluice: forceOnActive(forceSluiceEvent),
      foundry: forceOnActive(forceFoundryEvent),
      "jet-stream": forceOnActive(forceJetStreamEvent),
      moat: forceOnActive(forceMoatEvent),
      seep: forceOnActive(forceSeepEvent),
      meander: forceOnActive(forceMeanderEvent),
      waltz: forceOnActive(forceWaltzEvent),
      gyroscope: forceOnActive(forceGyroscopeEvent),
      dragonfly: forceOnActive(forceDragonflyEvent),
      "ring-toss": forceOnActive(forceRingTossEvent),
      slipstream: forceOnActive(forceSlipstreamEvent),
      "sheet-music": forceOnActive(forceSheetMusicEvent),
      "leaf-blower": forceOnActive(forceLeafBlowerEvent),
      loom: forceOnActive(forceLoomEvent),
      "high-dive": forceOnActive(forceHighDiveEvent),
      sower: forceOnActive(forceSowerEvent),
      courier: forceOnActive(forceCourierEvent),
      rodeo: forceOnActive(forceRodeoEvent),
      crosshair: forceOnActive(forceCrosshairEvent),
      iris: forceOnActive(forceIrisEvent),
      "bank-shot": forceOnActive(forceBankShotEvent),
      sunbeams: forceOnActive(forceSunbeamsEvent),
      stargate: forceOnActive(forceStargateEvent),
      "cats-cradle": forceOnActive(forceCatsCradleEvent),
      thunderhead: forceOnActive(forceThunderheadEvent),
      pitchfork: forceOnActive(forcePitchforkEvent),
      "jumper-cables": forceOnActive(forceJumperCablesEvent),
      lash: forceOnActive(forceLashEvent),
      "spark-plug": forceOnActive(forceSparkPlugEvent),
      "live-wire": forceOnActive(forceLiveWireEvent),
      "fuse-race": forceOnActive(forceFuseRaceEvent),
      "bouncing-betty": forceOnActive(forceBouncingBettyEvent),
      "pressure-cooker": forceOnActive(forcePressureCookerEvent),
      "hot-potato": forceOnActive(forceHotPotatoEvent),
      "daisy-chain": forceOnActive(forceDaisyChainEvent),
      "shaped-charge": forceOnActive(forceShapedChargeEvent),
      detcord: forceOnActive(forceDetcordEvent),
      "bullet-bloom": forceOnActive(forceBulletBloomEvent),
      "high-noon": forceOnActive(forceHighNoonEvent),
      hailfire: forceOnActive(forceHailfireEvent),
      dervish: forceOnActive(forceDervishEvent),
      invaders: forceOnActive(forceInvadersEvent),
      "gun-kata": forceOnActive(forceGunKataEvent),
      lockbuster: forceOnActive(forceLockbusterEvent),
      "connect-four": forceOnActive(forceConnectFourEvent),
      combo: forceOnActive(forceComboEvent),
      "skee-ball": forceOnActive(forceSkeeBallEvent),
      "bubble-shooter": forceOnActive(forceBubbleShooterEvent),
      delta: forceOnActive(forceDeltaEvent),
      hydrant: forceOnActive(forceHydrantEvent),
      cloverleaf: forceOnActive(forceCloverleafEvent),
      pinstripe: forceOnActive(forcePinstripeEvent),
      faucet: forceOnActive(forceFaucetEvent),
      showerhead: forceOnActive(forceShowerheadEvent),
      "binary-star": forceOnActive(forceBinaryStarEvent),
      hopscotch: forceOnActive(forceHopscotchEvent),
      tadpoles: forceOnActive(forceTadpolesEvent),
      blink: forceOnActive(forceBlinkEvent),
      "bumper-cars": forceOnActive(forceBumperCarsEvent),
      pigeons: forceOnActive(forcePigeonsEvent),
      squid: forceOnActive(forceSquidEvent),
      "water-pistol": forceOnActive(forceWaterPistolEvent),
      poi: forceOnActive(forcePoiEvent),
      bartender: forceOnActive(forceBartenderEvent),
      "pole-vault": forceOnActive(forcePoleVaultEvent),
      "paint-roller": forceOnActive(forcePaintRollerEvent),
      buzzsaw: forceOnActive(forceBuzzsawEvent),
      "light-cycles": forceOnActive(forceLightCyclesEvent),
      "fiber-optic": forceOnActive(forceFiberOpticEvent),
      "daddy-longlegs": forceOnActive(forceDaddyLonglegsEvent),
      knighthood: forceOnActive(forceKnighthoodEvent),
      "cutting-torch": forceOnActive(forceCuttingTorchEvent),
      "st-elmos-fire": forceOnActive(forceStElmosFireEvent),
      "stepped-leader": forceOnActive(forceSteppedLeaderEvent),
      trolley: forceOnActive(forceTrolleyEvent),
      "bolt-bounce": forceOnActive(forceBoltBounceEvent),
      "storm-crown": forceOnActive(forceStormCrownEvent),
      "van-de-graaff": forceOnActive(forceVanDeGraaffEvent),
      "barrel-roll": forceOnActive(forceBarrelRollEvent),
      "bomb-stack": forceOnActive(forceBombStackEvent),
      "roman-candle": forceOnActive(forceRomanCandleEvent),
      whistlers: forceOnActive(forceWhistlersEvent),
      trebuchet: forceOnActive(forceTrebuchetEvent),
      "drop-pods": forceOnActive(forceDropPodsEvent),
      "bomb-carousel": forceOnActive(forceBombCarouselEvent),
      "last-stand": forceOnActive(forceLastStandEvent),
      "tin-can": forceOnActive(forceTinCanEvent),
      "point-defense": forceOnActive(forcePointDefenseEvent),
      "target-practice": forceOnActive(forceTargetPracticeEvent),
      "flare-gun": forceOnActive(forceFlareGunEvent),
      rappel: forceOnActive(forceRappelEvent),
      stacker: forceOnActive(forceStackerEvent),
      "coin-pusher": forceOnActive(forceCoinPusherEvent),
      "high-striker": forceOnActive(forceHighStrikerEvent),
      "note-highway": forceOnActive(forceNoteHighwayEvent),
      safecracker: forceOnActive(forceSafecrackerEvent),
      "gumball-machine": forceOnActive(forceGumballMachineEvent),
      ninja: forceOnActive(forceNinjaEvent),
      bungee: forceOnActive(forceBungeeEvent),
      "funnel-cake": forceOnActive(forceFunnelCakeEvent),
      chrysanthemum: forceOnActive(forceChrysanthemumEvent),
      crossroads: forceOnActive(forceCrossroadsEvent),
      waterslide: forceOnActive(forceWaterslideEvent),
      banner: forceOnActive(forceBannerEvent),
      haunt: forceOnActive(forceHauntEvent),
      "maple-seeds": forceOnActive(forceMapleSeedsEvent),
      donuts: forceOnActive(forceDonutsEvent),
      "hamster-wheel": forceOnActive(forceHamsterWheelEvent),
      "lunar-lander": forceOnActive(forceLunarLanderEvent),
      dowsing: forceOnActive(forceDowsingEvent),
      matador: forceOnActive(forceMatadorEvent),
      "flash-flood": forceOnActive(forceFlashFloodEvent),
      dolphin: forceOnActive(forceDolphinEvent),
      puffer: forceOnActive(forcePufferEvent),
      "hockey-stop": forceOnActive(forceHockeyStopEvent),
      twirl: forceOnActive(forceTwirlEvent),
      whale: forceOnActive(forceWhaleEvent),
      "light-painting": forceOnActive(forceLightPaintingEvent),
      "saber-throw": forceOnActive(forceSaberThrowEvent),
      "laser-maze": forceOnActive(forceLaserMazeEvent),
      "tape-measure": forceOnActive(forceTapeMeasureEvent),
      pulsar: forceOnActive(forcePulsarEvent),
      "short-circuit": forceOnActive(forceShortCircuitEvent),
      conductor: forceOnActive(forceConductorEvent),
      "double-strike": forceOnActive(forceDoubleStrikeEvent),
      "lightning-fence": forceOnActive(forceLightningFenceEvent),
      "heat-lightning": forceOnActive(forceHeatLightningEvent),
      "powder-kegs": forceOnActive(forcePowderKegsEvent),
      "bomb-fountain": forceOnActive(forceBombFountainEvent),
      "frag-out": forceOnActive(forceFragOutEvent),
      "fault-line": forceOnActive(forceFaultLineEvent),
      "willow-shells": forceOnActive(forceWillowShellsEvent),
      "swarm-strike": forceOnActive(forceSwarmStrikeEvent),
      concentric: forceOnActive(forceConcentricEvent),
      graze: forceOnActive(forceGrazeEvent),
      hotfoot: forceOnActive(forceHotfootEvent),
      dogfight: forceOnActive(forceDogfightEvent),
      "bullet-rose": forceOnActive(forceBulletRoseEvent),
      "armor-piercer": forceOnActive(forceArmorPiercerEvent),
      spotter: forceOnActive(forceSpotterEvent),
      "peg-solitaire": forceOnActive(forcePegSolitaireEvent),
      "marble-drop": forceOnActive(forceMarbleDropEvent),
      statues: forceOnActive(forceStatuesEvent),
      "flappy-wisp": forceOnActive(forceFlappyWispEvent),
      "buried-treasure": forceOnActive(forceBuriedTreasureEvent),
      "air-hockey": forceOnActive(forceAirHockeyEvent),
      "bolt-of-cash": forceOnActive(forceBoltOfCashEvent),
      "pendulum-pour": forceOnActive(forcePendulumPourEvent),
      "pop-the-cork": forceOnActive(forcePopTheCorkEvent),
      "wall-jump": forceOnActive(forceWallJumpEvent),
      superball: forceOnActive(forceSuperballEvent),
      "spin-dash": forceOnActive(forceSpinDashEvent),
      cupid: forceOnActive(forceCupidEvent),
      stork: forceOnActive(forceStorkEvent),
      "paper-plane": forceOnActive(forcePaperPlaneEvent),
      spike: forceOnActive(forceSpikeEvent),
      toaster: forceOnActive(forceToasterEvent),
      xylophone: forceOnActive(forceXylophoneEvent),
      "birthday-candles": forceOnActive(forceBirthdayCandlesEvent),
      "drop-tower": forceOnActive(forceDropTowerEvent),
      "arrow-volley": forceOnActive(forceArrowVolleyEvent),
      "make-a-wish": forceOnActive(forceMakeAWishEvent),
      blunderbuss: forceOnActive(forceBlunderbussEvent),
      genie: forceOnActive(forceGenieEvent),
      "solar-flare": forceOnActive(forceSolarFlareEvent),
      "heat-vision": forceOnActive(forceHeatVisionEvent),
      "print-head": forceOnActive(forcePrintHeadEvent),
      aurora: forceOnActive(forceAuroraEvent),
      "thunder-rings": forceOnActive(forceThunderRingsEvent),
      "arc-weld": forceOnActive(forceArcWeldEvent),
      "storm-kite": forceOnActive(forceStormKiteEvent),
      "volcanic-lightning": forceOnActive(forceVolcanicLightningEvent),
      sculptor: forceOnActive(forceSculptorEvent),
      "grand-finale": forceOnActive(forceGrandFinaleEvent),
      "bomb-bouquet": forceOnActive(forceBombBouquetEvent),
      cascade: forceOnActive(forceCascadeEvent),
      "pinball-bomb": forceOnActive(forcePinballBombEvent),
      "bomb-train": forceOnActive(forceBombTrainEvent),
      "breaching-charge": forceOnActive(forceBreachingChargeEvent),
      "confetti-cannon": forceOnActive(forceConfettiCannonEvent),
      "ammo-belt": forceOnActive(forceAmmoBeltEvent),
      gauntlet: forceOnActive(forceGauntletEvent),
      "turret-tower": forceOnActive(forceTurretTowerEvent),
      "shell-casings": forceOnActive(forceShellCasingsEvent),
      darts: forceOnActive(forceDartsEvent),
      battleship: forceOnActive(forceBattleshipEvent),
      interceptors: forceOnActive(forceInterceptorsEvent),
      "land-grab": forceOnActive(forceLandGrabEvent),
      "duck-duck-goose": forceOnActive(forceDuckDuckGooseEvent),
      ringer: forceOnActive(forceRingerEvent),
      hurdles: forceOnActive(forceHurdlesEvent),
      "lucky-roll": forceOnActive(forceLuckyRollEvent),
      "cash-register": forceOnActive(forceCashRegisterEvent),
      "horse-race": forceOnActive(forceHorseRaceEvent),
      "dunk-tank": forceOnActive(forceDunkTankEvent),
      "half-pipe": forceOnActive(forceHalfPipeEvent),
      knot: forceOnActive(forceKnotEvent),
      "ticker-tape": forceOnActive(forceTickerTapeEvent),
      "cash-bridge": forceOnActive(forceCashBridgeEvent),
      "skipping-stone": forceOnActive(forceSkippingStoneEvent),
      woodpecker: forceOnActive(forceWoodpeckerEvent),
      frisbee: forceOnActive(forceFrisbeeEvent),
      kangaroo: forceOnActive(forceKangarooEvent),
      badminton: forceOnActive(forceBadmintonEvent),
      tumbleweed: forceOnActive(forceTumbleweedEvent),
      "shuttle-run": forceOnActive(forceShuttleRunEvent),
      echolocation: forceOnActive(forceEcholocationEvent),
      lacrosse: forceOnActive(forceLacrosseEvent),
      "jet-ski": forceOnActive(forceJetSkiEvent),
      "drinking-straw": forceOnActive(forceDrinkingStrawEvent),
      "sea-serpent": forceOnActive(forceSeaSerpentEvent),
      "magic-trick": forceOnActive(forceMagicTrickEvent),
      "fountain-pen": forceOnActive(forceFountainPenEvent),
      spool: forceOnActive(forceSpoolEvent),
      "laser-rain": forceOnActive(forceLaserRainEvent),
      "cross-cut": forceOnActive(forceCrossCutEvent),
      heliograph: forceOnActive(forceHeliographEvent),
      starburst: forceOnActive(forceStarburstEvent),
      "thunder-drum": forceOnActive(forceThunderDrumEvent),
      "bolt-barrage": forceOnActive(forceBoltBarrageEvent),
      coilgun: forceOnActive(forceCoilgunEvent),
      snowflake: forceOnActive(forceSnowflakeEvent),
      "bomb-snake": forceOnActive(forceBombSnakeEvent),
      "spider-mines": forceOnActive(forceSpiderMinesEvent),
      crossette: forceOnActive(forceCrossetteEvent),
      "spiral-charge": forceOnActive(forceSpiralChargeEvent),
      "bomb-bubbles": forceOnActive(forceBombBubblesEvent),
      "rocket-sled": forceOnActive(forceRocketSledEvent),
      "dynamite-fishing": forceOnActive(forceDynamiteFishingEvent),
      "charge-shot": forceOnActive(forceChargeShotEvent),
      "corkscrew-rounds": forceOnActive(forceCorkscrewRoundsEvent),
      "orbital-guns": forceOnActive(forceOrbitalGunsEvent),
      "tracer-rounds": forceOnActive(forceTracerRoundsEvent),
      "pellet-storm": forceOnActive(forcePelletStormEvent),
      "bullet-snake": forceOnActive(forceBulletSnakeEvent),
      "rock-paper-scissors": forceOnActive(forceRockPaperScissorsEvent),
      limbo: forceOnActive(forceLimboEvent),
      "quiz-show": forceOnActive(forceQuizShowEvent),
      sumo: forceOnActive(forceSumoEvent),
      "paper-toss": forceOnActive(forcePaperTossEvent),
      "arm-wrestling": forceOnActive(forceArmWrestlingEvent),
      "keepy-uppy": forceOnActive(forceKeepyUppyEvent),
      "pin-the-tail": forceOnActive(forcePinTheTailEvent),
      "trust-fall": forceOnActive(forceTrustFallEvent),
      "bubble-gum": forceOnActive(forceBubbleGumEvent),
      "canal-locks": forceOnActive(forceCanalLocksEvent),
      bobsled: forceOnActive(forceBobsledEvent),
      "spring-loaded": forceOnActive(forceSpringLoadedEvent),
      influx: forceOnActive(forceInfluxEvent),
      "uneven-bars": forceOnActive(forceUnevenBarsEvent),
      bumblebee: forceOnActive(forceBumblebeeEvent),
      "shot-put": forceOnActive(forceShotPutEvent),
      "human-cannonball": forceOnActive(forceHumanCannonballEvent),
      "fox-and-hounds": forceOnActive(forceFoxAndHoundsEvent),
      kingfisher: forceOnActive(forceKingfisherEvent),
      joust: forceOnActive(forceJoustEvent),
      pelican: forceOnActive(forcePelicanEvent),
      dragster: forceOnActive(forceDragsterEvent),
      "fire-breather": forceOnActive(forceFireBreatherEvent),
      "bucket-swing": forceOnActive(forceBucketSwingEvent),
      puppeteer: forceOnActive(forcePuppeteerEvent),
      corona: forceOnActive(forceCoronaEvent),
      pillars: forceOnActive(forcePillarsEvent),
      "laser-ladder": forceOnActive(forceLaserLadderEvent),
      "beam-splitter": forceOnActive(forceBeamSplitterEvent),
      teleporter: forceOnActive(forceTeleporterEvent),
      "ring-light": forceOnActive(forceRingLightEvent),
      taser: forceOnActive(forceTaserEvent),
      "arc-furnace": forceOnActive(forceArcFurnaceEvent),
      "five-fingers": forceOnActive(forceFiveFingersEvent),
      "cattle-prod": forceOnActive(forceCattleProdEvent),
      "bolt-sling": forceOnActive(forceBoltSlingEvent),
      "colliding-storms": forceOnActive(forceCollidingStormsEvent),
      "bomb-juggler": forceOnActive(forceBombJugglerEvent),
      "bomb-squad": forceOnActive(forceBombSquadEvent),
      splitter: forceOnActive(forceSplitterEvent),
      "bomb-pendulum": forceOnActive(forceBombPendulumEvent),
      paradrop: forceOnActive(forceParadropEvent),
      "bomb-pachinko": forceOnActive(forceBombPachinkoEvent),
      "fuse-clock": forceOnActive(forceFuseClockEvent),
      hedgehog: forceOnActive(forceHedgehogEvent),
      "split-shot": forceOnActive(forceSplitShotEvent),
      "bullet-lasso": forceOnActive(forceBulletLassoEvent),
      "bullet-weave": forceOnActive(forceBulletWeaveEvent),
      "bullet-fountain": forceOnActive(forceBulletFountainEvent),
      "covering-fire": forceOnActive(forceCoveringFireEvent),
      checkers: forceOnActive(forceCheckersEvent),
      minesweeper: forceOnActive(forceMinesweeperEvent),
      "jack-in-the-box": forceOnActive(forceJackInTheBoxEvent),
      spillway: forceOnActive(forceSpillwayEvent),
      crosscurrents: forceOnActive(forceCrosscurrentsEvent),
      oxbow: forceOnActive(forceOxbowEvent),
      breakers: forceOnActive(forceBreakersEvent),
      rivulets: forceOnActive(forceRivuletsEvent),
      torrent: forceOnActive(forceTorrentEvent),
      lissajous: forceOnActive(forceLissajousEvent),
      "moon-hop": forceOnActive(forceMoonHopEvent),
      peekaboo: forceOnActive(forcePeekabooEvent),
      "tilt-a-whirl": forceOnActive(forceTiltAWhirlEvent),
      "water-strider": forceOnActive(forceWaterStriderEvent),
      "rope-climb": forceOnActive(forceRopeClimbEvent),
      "paddle-steamer": forceOnActive(forcePaddleSteamerEvent),
      "jet-wash": forceOnActive(forceJetWashEvent),
      bellows: forceOnActive(forceBellowsEvent),
      "rain-dance": forceOnActive(forceRainDanceEvent),
      "ski-tow": forceOnActive(forceSkiTowEvent),
      "ribbon-dancer": forceOnActive(forceRibbonDancerEvent),
      "laser-turnstile": forceOnActive(forceLaserTurnstileEvent),
      "light-bridge": forceOnActive(forceLightBridgeEvent),
      "laser-web": forceOnActive(forceLaserWebEvent),
      footlights: forceOnActive(forceFootlightsEvent),
      "fusion-beam": forceOnActive(forceFusionBeamEvent),
      pinpoint: forceOnActive(forcePinpointEvent),
      galvanize: forceOnActive(forceGalvanizeEvent),
      "spark-jump": forceOnActive(forceSparkJumpEvent),
      "static-cling": forceOnActive(forceStaticClingEvent),
      capacitor: forceOnActive(forceCapacitorEvent),
      "spark-train": forceOnActive(forceSparkTrainEvent),
      "arc-bridge": forceOnActive(forceArcBridgeEvent),
      "daisy-cutter": forceOnActive(forceDaisyCutterEvent),
      "ripple-mines": forceOnActive(forceRippleMinesEvent),
      "bomb-yo-yo": forceOnActive(forceBombYoYoEvent),
      "bomb-hail": forceOnActive(forceBombHailEvent),
      "ground-pound": forceOnActive(forceGroundPoundEvent),
      "cherry-bomb": forceOnActive(forceCherryBombEvent),
      "bomb-crown": forceOnActive(forceBombCrownEvent),
      "bullet-comb": forceOnActive(forceBulletCombEvent),
      "bullet-braid": forceOnActive(forceBulletBraidEvent),
      "bullet-cage": forceOnActive(forceBulletCageEvent),
      gunslinger: forceOnActive(forceGunslingerEvent),
      "bullet-wheel": forceOnActive(forceBulletWheelEvent),
      "bullet-ladder": forceOnActive(forceBulletLadderEvent),
      "whip-zoom": forceOnActive(forceWhipZoomEvent),
      "iris-out": forceOnActive(forceIrisOutEvent),
      "screen-reels": forceOnActive(forceScreenReelsEvent),
      "gold-leaf": forceOnActive(forceGoldLeafEvent),
      "pixel-storm": forceOnActive(forcePixelStormEvent),
      "gravity-flip": forceOnActive(forceGravityFlipEvent),
      echo: forceOnActive(forceEchoEvent),
      "mirror-box": forceOnActive(forceMirrorBoxEvent),
      "pull-back": forceOnActive(forcePullBackEvent),
      treadmill: forceOnActive(forceTreadmillEvent),
      "blast-off": forceOnActive(forceBlastOffEvent),
      "pop-up": forceOnActive(forcePopUpEvent),
      "sticker-peel": forceOnActive(forceStickerPeelEvent),
      glissando: forceOnActive(forceGlissandoEvent),
      "vault-doors": forceOnActive(forceVaultDoorsEvent),
      "champagne-tower": forceOnActive(forceChampagneTowerEvent),
      "pinball-river": forceOnActive(forcePinballRiverEvent),
      "pressure-washer": forceOnActive(forcePressureWasherEvent),
      irrigation: forceOnActive(forceIrrigationEvent),
      waterspout: forceOnActive(forceWaterspoutEvent),
      sidewinder: forceOnActive(forceSidewinderEvent),
      "orbit-swap": forceOnActive(forceOrbitSwapEvent),
      cuckoo: forceOnActive(forceCuckooEvent),
      gyre: forceOnActive(forceGyreEvent),
      "bar-hop": forceOnActive(forceBarHopEvent),
      "comet-plow": forceOnActive(forceCometPlowEvent),
      "hose-reel": forceOnActive(forceHoseReelEvent),
      "geyser-rider": forceOnActive(forceGeyserRiderEvent),
      "bubble-blower": forceOnActive(forceBubbleBlowerEvent),
      "pool-dive": forceOnActive(forcePoolDiveEvent),
      "rubber-band": forceOnActive(forceRubberBandEvent),
      "beam-vise": forceOnActive(forceBeamViseEvent),
      "laser-rake": forceOnActive(forceLaserRakeEvent),
      "light-dominoes": forceOnActive(forceLightDominoesEvent),
      "pry-bar": forceOnActive(forcePryBarEvent),
      "tesla-tennis": forceOnActive(forceTeslaTennisEvent),
      "tuning-fork": forceOnActive(forceTuningForkEvent),
      "bolt-spiral": forceOnActive(forceBoltSpiralEvent),
      "ground-current": forceOnActive(forceGroundCurrentEvent),
      overcharge: forceOnActive(forceOverchargeEvent),
      "bomb-tornado": forceOnActive(forceBombTornadoEvent),
      "bomb-boomerang": forceOnActive(forceBombBoomerangEvent),
      multistage: forceOnActive(forceMultistageEvent),
      "bomb-pile": forceOnActive(forceBombPileEvent),
      "bomb-garland": forceOnActive(forceBombGarlandEvent),
      "homing-rounds": forceOnActive(forceHomingRoundsEvent),
      "wave-cannon": forceOnActive(forceWaveCannonEvent),
      snapback: forceOnActive(forceSnapbackEvent),
      "bullet-funnel": forceOnActive(forceBulletFunnelEvent),
      crisscross: forceOnActive(forceCrisscrossEvent),
      "chain-fountain": forceOnActive(forceChainFountainEvent),
      "smoke-rings": forceOnActive(forceSmokeRingsEvent),
      "water-salute": forceOnActive(forceWaterSaluteEvent),
      "double-pendulum": forceOnActive(forceDoublePendulumEvent),
      trapeze: forceOnActive(forceTrapezeEvent),
      diabolo: forceOnActive(forceDiaboloEvent),
      zorb: forceOnActive(forceZorbEvent),
      "hoop-dive": forceOnActive(forceHoopDiveEvent),
      "spin-art": forceOnActive(forceSpinArtEvent),
      "paper-cutter": forceOnActive(forcePaperCutterEvent),
      flippers: forceOnActive(forceFlippersEvent),
      drawbridge: forceOnActive(forceDrawbridgeEvent),
      flail: forceOnActive(forceFlailEvent),
      "vine-swing": forceOnActive(forceVineSwingEvent),
      "bomb-snowball": forceOnActive(forceBombSnowballEvent),
      gerb: forceOnActive(forceGerbEvent),
      recoil: forceOnActive(forceRecoilEvent),
      "tumble-fire": forceOnActive(forceTumbleFireEvent),
      "roll-up": forceOnActive(forceRollUpEvent),
      shredder: forceOnActive(forceShredderEvent),
      "head-on": forceOnActive(forceHeadOnEvent),
      pyramid: forceOnActive(forcePyramidEvent),
      "pizza-toss": forceOnActive(forcePizzaTossEvent),
      compass: forceOnActive(forceCompassEvent),
      skewer: forceOnActive(forceSkewerEvent),
      "bomb-comet": forceOnActive(forceBombCometEvent),
      kaboom: forceOnActive(forceKaboomEvent),
      "return-fire": forceOnActive(forceReturnFireEvent),
      "frosted-glass": forceOnActive(forceFrostedGlassEvent),
      "switch-off": forceOnActive(forceSwitchOffEvent),
      "stunt-track": forceOnActive(forceStuntTrackEvent),
      fleas: forceOnActive(forceFleasEvent),
      "hand-pump": forceOnActive(forceHandPumpEvent),
      "pick-up-sticks": forceOnActive(forcePickUpSticksEvent),
      "thunder-shell": forceOnActive(forceThunderShellEvent),
      "mid-air": forceOnActive(forceMidAirEvent),
      "chain-fire": forceOnActive(forceChainFireEvent),
      "rim-shot": forceOnActive(forceRimShotEvent),
      "tin-roof": forceOnActive(forceTinRoofEvent),
      crumple: forceOnActive(forceCrumpleEvent),
      minimize: forceOnActive(forceMinimizeEvent),
      "jumping-jets": forceOnActive(forceJumpingJetsEvent),
      "bubble-chamber": forceOnActive(forceBubbleChamberEvent),
      "cast-net": forceOnActive(forceCastNetEvent),
      hoberman: forceOnActive(forceHobermanEvent),
      excalibur: forceOnActive(forceExcaliburEvent),
      pistons: forceOnActive(forcePistonsEvent),
      "william-tell": forceOnActive(forceWilliamTellEvent),
      foosball: forceOnActive(forceFoosballEvent),
      "rubber-sheet": forceOnActive(forceRubberSheetEvent),
      rattle: forceOnActive(forceRattleEvent),
      eddies: forceOnActive(forceEddiesEvent),
      "tube-man": forceOnActive(forceTubeManEvent),
      deflate: forceOnActive(forceDeflateEvent),
      "gear-train": forceOnActive(forceGearTrainEvent),
      upstrike: forceOnActive(forceUpstrikeEvent),
      "creeping-barrage": forceOnActive(forceCreepingBarrageEvent),
      "ballistic-pendulum": forceOnActive(forceBallisticPendulumEvent),
      "ring-taw": forceOnActive(forceRingTawEvent),
      "rainy-window": forceOnActive(forceRainyWindowEvent),
      inflate: forceOnActive(forceInflateEvent),
      "dome-fountains": forceOnActive(forceDomeFountainsEvent),
      "bell-ringers": forceOnActive(forceBellRingersEvent),
      "wet-dog": forceOnActive(forceWetDogEvent),
      "tower-crane": forceOnActive(forceTowerCraneEvent),
      "bead-lightning": forceOnActive(forceBeadLightningEvent),
      rockslide: forceOnActive(forceRockslideEvent),
      "tight-group": forceOnActive(forceTightGroupEvent),
      jacks: forceOnActive(forceJacksEvent),
      "reflecting-pool": forceOnActive(forceReflectingPoolEvent),
      "pin-art": forceOnActive(forcePinArtEvent),
      "twin-whirlpools": forceOnActive(forceTwinWhirlpoolsEvent),
      hatchlings: forceOnActive(forceHatchlingsEvent),
      butterfingers: forceOnActive(forceButterfingersEvent),
      "lock-pick": forceOnActive(forceLockPickEvent),
      blacksmith: forceOnActive(forceBlacksmithEvent),
      "seismic-charges": forceOnActive(forceSeismicChargesEvent),
      "skip-shots": forceOnActive(forceSkipShotsEvent),
      "jumping-beans": forceOnActive(forceJumpingBeansEvent),
      "swiss-cheese": forceOnActive(forceSwissCheeseEvent),
      "exploded-view": forceOnActive(forceExplodedViewEvent),
      riptide: forceOnActive(forceRiptideEvent),
      fencing: forceOnActive(forceFencingEvent),
      "water-tower": forceOnActive(forceWaterTowerEvent),
      "barber-pole": forceOnActive(forceBarberPoleEvent),
      "ion-cannon": forceOnActive(forceIonCannonEvent),
      claymore: forceOnActive(forceClaymoreEvent),
      pepperbox: forceOnActive(forcePepperboxEvent),
      squash: forceOnActive(forceSquashEvent),
      "vertical-hold": forceOnActive(forceVerticalHoldEvent),
      halftone: forceOnActive(forceHalftoneEvent),
      blowhole: forceOnActive(forceBlowholeEvent),
      lamplighter: forceOnActive(forceLamplighterEvent),
      "fire-brigade": forceOnActive(forceFireBrigadeEvent),
      spokes: forceOnActive(forceSpokesEvent),
      "thunder-ring": forceOnActive(forceThunderRingEvent),
      "bottle-rocket": forceOnActive(forceBottleRocketEvent),
      skeet: forceOnActive(forceSkeetEvent),
      tennis: forceOnActive(forceTennisEvent),
      interlace: forceOnActive(forceInterlaceEvent),
      "mirror-mirror": forceOnActive(forceMirrorMirrorEvent),
      "cotton-candy": forceOnActive(forceCottonCandyEvent),
      peloton: forceOnActive(forcePelotonEvent),
      "drinking-bird": forceOnActive(forceDrinkingBirdEvent),
      "laser-drill": forceOnActive(forceLaserDrillEvent),
      "hair-raiser": forceOnActive(forceHairRaiserEvent),
      detonator: forceOnActive(forceDetonatorEvent),
      "bullet-rain": forceOnActive(forceBulletRainEvent),
      "bouncy-castle": forceOnActive(forceBouncyCastleEvent),
      "game-of-life": forceOnActive(forceGameOfLifeEvent),
      labyrinth: forceOnActive(forceLabyrinthEvent),
      "tidal-bore": forceOnActive(forceTidalBoreEvent),
      scrum: forceOnActive(forceScrumEvent),
      "gold-rush": forceOnActive(forceGoldRushEvent),
      "suspension-bridge": forceOnActive(forceSuspensionBridgeEvent),
      redline: forceOnActive(forceRedlineEvent),
      willow: forceOnActive(forceWillowEvent),
      quickdraw: forceOnActive(forceQuickdrawEvent),
      "galilean-cannon": forceOnActive(forceGalileanCannonEvent),
      "chaos-game": forceOnActive(forceChaosGameEvent),
      sandpile: forceOnActive(forceSandpileEvent),
      auger: forceOnActive(forceAugerEvent),
      "fountain-show": forceOnActive(forceFountainShowEvent),
      "spinning-plates": forceOnActive(forceSpinningPlatesEvent),
      scoops: forceOnActive(forceScoopsEvent),
      "solar-furnace": forceOnActive(forceSolarFurnaceEvent),
      "lightning-hands": forceOnActive(forceLightningHandsEvent),
      "ring-of-fire": forceOnActive(forceRingOfFireEvent),
      "bullet-clash": forceOnActive(forceBulletClashEvent),
      "bounce-pass": forceOnActive(forceBouncePassEvent),
      "oil-strike": forceOnActive(forceOilStrikeEvent),
      harmonograph: forceOnActive(forceHarmonographEvent),
      quicksort: forceOnActive(forceQuicksortEvent),
      capillary: forceOnActive(forceCapillaryEvent),
      "battle-tops": forceOnActive(forceBattleTopsEvent),
      "pneumatic-tubes": forceOnActive(forcePneumaticTubesEvent),
      "star-polygon": forceOnActive(forceStarPolygonEvent),
      "volt-spider": forceOnActive(forceVoltSpiderEvent),
      "orbital-decay": forceOnActive(forceOrbitalDecayEvent),
      "spray-and-pray": forceOnActive(forceSprayAndPrayEvent),
      shuttle: forceOnActive(forceShuttleEvent),
      "drill-duel": forceOnActive(forceDrillDuelEvent),
      "rule-30": forceOnActive(forceRule30Event),
      airbrush: forceOnActive(forceAirbrushEvent),
      calving: forceOnActive(forceCalvingEvent),
      phoenix: forceOnActive(forcePhoenixEvent),
      "steam-train": forceOnActive(forceSteamTrainEvent),
      "light-sail": forceOnActive(forceLightSailEvent),
      inchworm: forceOnActive(forceInchwormEvent),
      "critical-mass": forceOnActive(forceCriticalMassEvent),
      "knife-thrower": forceOnActive(forceKnifeThrowerEvent),
      compactor: forceOnActive(forceCompactorEvent),
      "core-sample": forceOnActive(forceCoreSampleEvent),
      "foam-party": forceOnActive(forceFoamPartyEvent),
      "langtons-ant": forceOnActive(forceLangtonsAntEvent),
      othello: forceOnActive(forceOthelloEvent),
      gloop: forceOnActive(forceGloopEvent),
      "escape-velocity": forceOnActive(forceEscapeVelocityEvent),
      sungrazer: forceOnActive(forceSungrazerEvent),
      "fractal-tree": forceOnActive(forceFractalTreeEvent),
      switchboard: forceOnActive(forceSwitchboardEvent),
      interference: forceOnActive(forceInterferenceEvent),
      "tower-defense": forceOnActive(forceTowerDefenseEvent),
      "bounce-wave": forceOnActive(forceBounceWaveEvent),
      mole: forceOnActive(forceMoleEvent),
      "car-wash": forceOnActive(forceCarWashEvent),
      "dragon-curve": forceOnActive(forceDragonCurveEvent),
      "lights-out": forceOnActive(forceLightsOutEvent),
      tumbler: forceOnActive(forceTumblerEvent),
      "waggle-dance": forceOnActive(forceWaggleDanceEvent),
      "water-cycle": forceOnActive(forceWaterCycleEvent),
      "folding-rule": forceOnActive(forceFoldingRuleEvent),
      "arc-swarm": forceOnActive(forceArcSwarmEvent),
      lockstep: forceOnActive(forceLockstepEvent),
      "hacky-sack": forceOnActive(forceHackySackEvent),
      woodworm: forceOnActive(forceWoodwormEvent),
      graffiti: forceOnActive(forceGraffitiEvent),
      voronoi: forceOnActive(forceVoronoiEvent),
      percolation: forceOnActive(forcePercolationEvent),
      dune: forceOnActive(forceDuneEvent),
      "string-of-pearls": forceOnActive(forceStringOfPearlsEvent),
      "river-juggler": forceOnActive(forceRiverJugglerEvent),
      "like-charges": forceOnActive(forceLikeChargesEvent),
      "collision-course": forceOnActive(forceCollisionCourseEvent),
      "target-wheel": forceOnActive(forceTargetWheelEvent),
      "spinning-hexagon": forceOnActive(forceSpinningHexagonEvent),
      "bead-drill": forceOnActive(forceBeadDrillEvent),
      hydroseeder: forceOnActive(forceHydroseederEvent),
      mancala: forceOnActive(forceMancalaEvent),
      breakthrough: forceOnActive(forceBreakthroughEvent),
      curves: forceOnActive(forceCurvesEvent),
      "archimedes-screw": forceOnActive(forceArchimedesScrewEvent),
      murmuration: forceOnActive(forceMurmurationEvent),
      "spirit-bomb": forceOnActive(forceSpiritBombEvent),
      metronome: forceOnActive(forceMetronomeEvent),
      "power-grid": forceOnActive(forcePowerGridEvent),
      "bomb-bowling": forceOnActive(forceBombBowlingEvent),
      showdown: forceOnActive(forceShowdownEvent),
      "jump-rope": forceOnActive(forceJumpRopeEvent),
      strongbox: forceOnActive(forceStrongboxEvent),
      "snow-cannon": forceOnActive(forceSnowCannonEvent),
      "hill-climb": forceOnActive(forceHillClimbEvent),
      abacus: forceOnActive(forceAbacusEvent),
      coral: forceOnActive(forceCoralEvent),
      chladni: forceOnActive(forceChladniEvent),
      afterimage: forceOnActive(forceAfterimageEvent),
      "snow-globe": forceOnActive(forceSnowGlobeEvent),
      sundial: forceOnActive(forceSundialEvent),
      riveter: forceOnActive(forceRiveterEvent),
      "paddle-ball": forceOnActive(forcePaddleBallEvent),
      geode: forceOnActive(forceGeodeEvent),
      "fog-machine": forceOnActive(forceFogMachineEvent),
      chicane: forceOnActive(forceChicaneEvent),
      epicycles: forceOnActive(forceEpicyclesEvent),
      sieve: forceOnActive(forceSieveEvent),
      clutter: forceOnActive(forceClutterEvent),
      parting: forceOnActive(forcePartingEvent),
      "buzz-wire": forceOnActive(forceBuzzWireEvent),
      hiccups: forceOnActive(forceHiccupsEvent),
      "cut-the-rope": forceOnActive(forceCutTheRopeEvent),
      "whispering-gallery": forceOnActive(forceWhisperingGalleryEvent),
      chunnel: forceOnActive(forceChunnelEvent),
      sneeze: forceOnActive(forceSneezeEvent),
      "grand-prix": forceOnActive(forceGrandPrixEvent),
      "pillow-fight": forceOnActive(forcePillowFightEvent),
      "dots-and-boxes": forceOnActive(forceDotsAndBoxesEvent),
      "holding-pattern": forceOnActive(forceHoldingPatternEvent),
      tanker: forceOnActive(forceTankerEvent),
      "vapor-cloud": forceOnActive(forceVaporCloudEvent),
      "shield-breaker": forceOnActive(forceShieldBreakerEvent),
      bottleneck: forceOnActive(forceBottleneckEvent),
      skylight: forceOnActive(forceSkylightEvent),
      deluge: forceOnActive(forceDelugeEvent),
      monaco: forceOnActive(forceMonacoEvent),
      "glitter-spill": forceOnActive(forceGlitterSpillEvent),
      "rogue-wave": forceOnActive(forceRogueWaveEvent),
      "thunder-egg": forceOnActive(forceThunderEggEvent),
      hologram: forceOnActive(forceHologramEvent),
      "leaf-fall": forceOnActive(forceLeafFallEvent),
      "three-body": forceOnActive(forceThreeBodyEvent),
      "seed-pods": forceOnActive(forceSeedPodsEvent),
      "ripple-fire": forceOnActive(forceRippleFireEvent),
      "spark-chamber": forceOnActive(forceSparkChamberEvent),
      turbine: forceOnActive(forceTurbineEvent),
      "strange-attractor": forceOnActive(forceStrangeAttractorEvent),
      "topsy-turvy": forceOnActive(forceTopsyTurvyEvent),
      "gold-plating": forceOnActive(forceGoldPlatingEvent),
      crosswind: forceOnActive(forceCrosswindEvent),
      hailstone: forceOnActive(forceHailstoneEvent),
      "hilbert-curve": forceOnActive(forceHilbertCurveEvent),
      "le-mans": forceOnActive(forceLeMansEvent),
      "tunnel-borer": forceOnActive(forceTunnelBorerEvent),
      harpoon: forceOnActive(forceHarpoonEvent),
      "eight-queens": forceOnActive(forceEightQueensEvent),
      "shortest-path": forceOnActive(forceShortestPathEvent),
      sinkhole: forceOnActive(forceSinkholeEvent),
      backwash: forceOnActive(forceBackwashEvent),
      deflector: forceOnActive(forceDeflectorEvent),
      sunflower: forceOnActive(forceSunflowerEvent),
      "convex-hull": forceOnActive(forceConvexHullEvent),
    });
    // same, for the Slash event
    wireSlashEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSlashEvent(floor);
    });
    // same, for the Jackhammer event
    wireJackhammerEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceJackhammerEvent(floor);
    });
    // same, for the Pummel event
    wirePummelEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePummelEvent(floor);
    });
    // same, for the Overload event
    wireOverloadEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceOverloadEvent(floor);
    });
    // same, for the Gatling event
    wireGatlingEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceGatlingEvent(floor);
    });
    // same, for the Press event
    wirePressEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePressEvent(floor);
    });
    // same, for the Drill event
    wireDrillEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceDrillEvent(floor);
    });
    // same, for the Burrow event
    wireBurrowEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBurrowEvent(floor);
    });
    // same, for the Ping Pong event
    wirePingPongEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePingPongEvent(floor);
    });
    // same, for the Slam Dunk event
    wireSlamDunkEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSlamDunkEvent(floor);
    });
    // same, for the Uppercut event
    wireUppercutEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceUppercutEvent(floor);
    });
    // same, for the Head Hop event
    wireHeadHopEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceHeadHopEvent(floor);
    });
    // same, for the Paparazzi event
    wirePaparazziEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePaparazziEvent(floor);
    });
    // same, for the Missile Barrage event
    wireMissileBarrageEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceMissileBarrageEvent(floor);
    });
    // same, for the Sonic Boom event
    wireSonicBoomEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSonicBoomEvent(floor);
    });
    // same, for the Mitosis event
    wireMitosisEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceMitosisEvent(floor);
    });
    // same, for the Plinko event
    wirePlinkoEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePlinkoEvent(floor);
    });
    // same, for the Hammer Throw event
    wireHammerThrowEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceHammerThrowEvent(floor);
    });
    // same, for the Snake event
    wireSnakeEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSnakeEvent(floor);
    });
    // same, for the Breakout event
    wireBreakoutEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBreakoutEvent(floor);
    });
    // same, for the Line Clear event
    wireLineClearEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceLineClearEvent(floor);
    });
    // same, for the Break Shot event
    wireBreakShotEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBreakShotEvent(floor);
    });
    // same, for the Bullet Hell event
    wireBulletHellEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBulletHellEvent(floor);
    });
    // same, for the Vortex event
    wireVortexEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceVortexEvent(floor);
    });
    // same, for the Ricochet event
    wireRicochetEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceRicochetEvent(floor);
    });
    // same, for the Waterfall event
    wireWaterfallEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceWaterfallEvent(floor);
    });
    // same, for the Conveyor event
    wireConveyorEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceConveyorEvent(floor);
    });
    // same, for the Fireflies event
    wireFirefliesEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceFirefliesEvent(floor);
    });
    // same, for the Payday event
    wirePaydayEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePaydayEvent(floor);
    });
    // same, for the Piggy Bank event
    wirePiggyBankEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePiggyBankEvent(floor);
    });
    // same, for the Coin Toss event
    wireCoinTossEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceCoinTossEvent(floor);
    });
    // same, for the Hourglass event
    wireHourglassEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceHourglassEvent(floor);
    });
    // same, for the Rocket event
    wireRocketEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceRocketEvent(floor);
    });
    // same, for the Reveal event
    wireRevealEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceRevealEvent(floor);
    });
    // same, for the Jackpot Reels event
    wireJackpotReelsEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceJackpotReelsEvent(floor);
    });
    // same, for the Chain Pay event
    wireChainPayEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceChainPayEvent(floor);
    });
    // same, for the Twister event
    wireTwisterEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceTwisterEvent(floor);
    });
    // same, for the Downpour event
    wireDownpourEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceDownpourEvent(floor);
    });
    // same, for the Trickle event
    wireTrickleEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceTrickleEvent(floor);
    });
    // same, for the Magnet event
    wireMagnetEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceMagnetEvent(floor);
    });
    // same, for the Spillover event
    wireSpilloverEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSpilloverEvent(floor);
    });
    // same, for the Constellation event
    wireConstellationEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceConstellationEvent(floor);
    });
    // same, for the Ascend event
    wireAscendEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceAscendEvent(floor);
    });
    // same, for the Rising Tide event
    wireRisingTideEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceRisingTideEvent(floor);
    });
    // same, for the Tidal Wave event
    wireTidalWaveEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceTidalWaveEvent(floor);
    });
    // same, for the Beanstalk event, on the top unlocked floor so the locked
    // one above it is in view
    wireBeanstalkEventTestButton(app, () => {
      const floors = buildings[activeBuildingIndex];
      if (!floors) return;
      const lockedIndex = floors.findIndex((f) => !f.unlocked);
      const floor = floors[lockedIndex - 1] ?? floors[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBeanstalkEvent(floor);
    });
    // same, for the Blessing event
    wireBlessingEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceBlessingEvent(floor);
    });
    // same, for the Halo event
    wireHaloEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceHaloEvent(floor);
    });
    // same, for the Comet event
    wireCometEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceCometEvent(floor);
    });
    // same, for the Meteor Shower event
    wireMeteorShowerEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceMeteorShowerEvent(floor);
    });
    // same, for the Mentor event
    wireMentorEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceMentorEvent(floor);
    });
    // same, for the Spark Chain event
    wireSparkChainEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceSparkChainEvent(floor);
    });
    // same, for the Polish event
    wirePolishEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePolishEvent(floor);
    });
    // same, for the Lighthouse event
    wireLighthouseEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceLighthouseEvent(floor);
    });
    // same, for the Recruit event
    wireRecruitEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceRecruitEvent(floor);
    });
    // same, for the Promotion Day event
    wirePromotionDayEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePromotionDayEvent(floor);
    });
    // same, for the Alchemy event
    wireAlchemyEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceAlchemyEvent(floor);
    });
    // same, for the Investment event
    wireInvestmentEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceInvestmentEvent(floor);
    });
    // same, for the Dividends event
    wireDividendsEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceDividendsEvent(floor);
    });
    // same, for the Wisp event
    wireWispEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceWispEvent(floor);
    });
    // same, for the Stream event
    wireStreamEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceStreamEvent(floor);
    });
    // same, for the Trails event
    wireTrailsEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceTrailsEvent(floor);
    });
    // same, for the Draw event
    wireDrawEventTestButton(app, (tier) => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceDrawEvent(floor, tier);
    });
    // same, for the Night Sky event
    wireNightSkyEventTestButton(app, (tier) => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceNightSkyEvent(floor, tier);
    });
    // same, for the Pitcher event
    wirePitcherEventTestButton(app, (tier) => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forcePitcherEvent(floor, tier);
    });
    // same, for the Glimmer event
    wireGlimmerEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceGlimmerEvent(floor);
    });
    // spawns a mouse if none is out, arms "Hunt!" on its floor and scrolls there
    wireHuntEventTestButton(app, () => {
      let floor = forceHuntEvent();
      if (!floor) {
        forceSpawnMouse(buildings[activeBuildingIndex] ?? []);
        floor = forceHuntEvent();
      }
      if (floor) gameCanvas.scrollActiveToFloor(floor);
    });
    // scrolls to the ground floor and plays the Swarm proc on its button
    wireSwarmEventTestButton(app, () => {
      const floors = buildings[activeBuildingIndex] ?? [];
      const floor = floors[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      startSwarmEvent(floor, true, floors, gameCanvas.getFloorRect);
    });
    // scrolls to the ground floor and arms an x5 crit there carrying Renovate
    wireRenovateEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceRenovateEvent(floor);
    });
    // same, for the Upgrade event
    wireUpgradeEventTestButton(app, () => {
      const floor = buildings[activeBuildingIndex]?.[0];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceUpgradeEvent(floor);
    });
    // arms the Unlock event on the floor right below the locked one
    wireUnlockEventTestButton(app, (unlockCrit) => {
      const floors = buildings[activeBuildingIndex] ?? [];
      const floor = floors[floors.findIndex((f) => !f.unlocked) - 1];
      if (!floor) return;
      gameCanvas.scrollActiveToFloor(floor);
      forceUnlockEvent(floor, unlockCrit);
    });
    wireResetButton(app, buildings);
    // wired last, so it sees every dropdown/button the block above created
    sortTestActionMenus(app);
    wireTestActionsFilter(app);
  }
  function startBuildingRenovation(
    floors: Floor[],
    plan: RenovationPlan,
    action: "upgrades" | "unlock" | "complete" | "buyAll" = "upgrades",
    onPurchased?: () => void,
  ): Promise<boolean> {
    const buildingIndex = buildings.indexOf(floors);
    if (
      buildingIndex < 0 ||
      isDetachedJobPending() ||
      renovations.running ||
      floors.some(isFloorLocked)
    )
      return Promise.resolve(false);
    const companyIndex = activeCompanyIndex;
    let mysticBuildings = 0;
    let companyBoosts = 0;
    const draftDeps = (draft: BuildingDraft): FloorActionsDeps => ({
      ...floorActionDeps(buildingIndex, draft.buildings),
      createMysticBuilding: () => {
        mysticBuildings++;
      },
      applyCompanyWideBoost: () => {
        applyBoostAll(draft.buildings[buildingIndex]);
        companyBoosts++;
      },
    });
    const upgrade = (draft: BuildingDraft, floor: Floor): void => {
      withDraftEconomy(draft, () =>
        performAutomatedUpgradeAfterPayment(
          draftDeps(draft),
          floor,
          draft.buildings[buildingIndex][0] === floor,
          true,
        ),
      );
    };
    refreshRenovationView();
    return renovations.start(companyIndex, buildingIndex, () =>
      renovateFloors({
        plan,
        buildings,
        buildingIndex,
        onPurchased,
        spend: (cost) => {
          if (!spendTotalIncome(cost)) return false;
          saveCurrentCompanyStateSoon();
          return true;
        },
        refund: (cost) => {
          addCompanyTotalIncome(companyIndex, cost);
          persist();
        },
        getMoney: getTotalIncome,
        isCurrent: () =>
          activeCompanyIndex === companyIndex &&
          buildings[buildingIndex] === floors,
        upgrade,
        keepPartialOnStop: action === "buyAll",
        createStep: (draft) => {
          if (action === "unlock")
            return createFloorUnlockStep(
              draft.buildings[buildingIndex],
              (floor) =>
                withDraftEconomy(draft, () =>
                  performAutomatedFloorUnlock(draftDeps(draft), floor, true),
                ),
            );
          if (action === "complete")
            return createBuildingCompletionStep(
              plan,
              draft.buildings[buildingIndex],
              (floor) => upgrade(draft, floor),
              {
                managerLevel: MANAGER_MIN_UPGRADE_COUNT,
                maxWorkers: MAX_RENDERED_WORKERS,
              },
            );
          if (action === "buyAll") {
            // the prepaid budget is the draft's wallet; what's left is refunded on commit
            draft.money = add(draft.money, plan.cost);
            let purchases = 0;
            return () =>
              purchases++ < BUY_ALL_MAX_PURCHASES &&
              withDraftEconomy(
                draft,
                () =>
                  cheapestPurchase(draft.buildings, buildingIndex)?.buy() ??
                  false,
              );
          }
          return undefined;
        },
        commit: (draft, rewardBase) => {
          buildings[buildingIndex] = draft.buildings[buildingIndex];
          addCompanyTotalIncome(
            companyIndex,
            subtract(draft.money, rewardBase),
          );
          for (let count = 0; count < mysticBuildings; count++)
            createMysticBuilding();
          if (companyBoosts > 0)
            for (const targets of buildings) applyBoostAll(targets);
          if (activeBuildingIndex === buildingIndex)
            gameCanvas.setActiveFloors(buildings[buildingIndex], true);
          persist();
        },
      }),
    );
  }
  const upgradeMenu = wireUpgradeMenu(
    app,
    () => buildings[activeBuildingIndex] ?? [],
    () => persist(),
    startBuildingRenovation,
    (floors, budget) => planRenovation(floors, budget),
  );
  // "Create new Corporation" adds a fresh named corporation above the current
  // one in the map's corp-name barrel (see corporationName.ts/cityMap's
  // drawCorporationNames) — roll up with the action bar to reach it.
  // Auto-switches to the new company, playing the exact same swoosh +
  // barrel-roll flourish a manual switch gets (see cityMapView's
  // animateSwitchToCompany) — its own completion is what actually calls
  // switchToCompany, same as a normal roll, so there's only ever one switch.
  // Delayed to start SWITCH_LEAD_MS before the dialog's own close animation
  // finishes, instead of firing immediately alongside it while the dialog
  // hasn't even started sliding away yet
  const corporationUpgradeMenu = wireCorporationUpgradeMenu(
    app,
    () => {
      const newIndex = createNewCorporation();
      corporationUpgradeMenu.close();
      setTimeout(() => {
        playSwoosh();
        cityMapView.animateSwitchToCompany(newIndex);
      }, DIALOG_CLOSE_MS - SWITCH_LEAD_MS);
    },
    // "Merge" (see hud/corporationUpgradeMenu's own Merge section): folds every
    // selected company's income/upgrades/stock into whichever one has the most
    // map progression, then closes the dialog and barrel-rolls to it, same
    // close+animate choreography as "Create new Corporation" above. If the
    // company we're switching AWAY from was itself one of the merged-away
    // ones, flag the next switch to skip re-snapshotting its now-stale live
    // state over the clear mergeCompanies already wrote to storage for it
    (companyIndices) => {
      const result = mergeCompanies(companyIndices, buildings);
      if (!result) return;
      const mergedAway = new Set(
        companyIndices.filter((index) => index !== result.survivorIndex),
      );
      skipNextOutgoingSnapshot = mergedAway.has(activeCompanyIndex);
      corporationUpgradeMenu.close();
      setTimeout(() => {
        playSwoosh();
        cityMapView.animateSwitchToCompany(result.survivorIndex);
      }, DIALOG_CLOSE_MS - SWITCH_LEAD_MS);
    },
  );
  const boostMenu = wireBoostMenu(
    app,
    () => buildings[activeBuildingIndex] ?? [],
    () => persist(),
    (floor) => gameCanvas.scrollActiveToFloor(floor, BOOST_BUTTON_SCREEN_SHARE),
    (floor) => gameCanvas.scrollActiveToFloor(floor, BOOST_BUTTON_SCREEN_SHARE),
  );
  const badgeCollection = wireBadgeCollection(app);
  const totalEarnedOverlay = wireTotalEarnedOverlay(app);
  // buys the next building outright if affordable at its milestone price.
  // Returns whether it succeeded so the map menu can decide whether to re-render
  function buyBuilding(targetBuildings = buildings): boolean {
    const buildingIndex = targetBuildings.length;
    const purchaseCost = getBuildingPrice(buildingIndex);
    if (!spendTotalIncome(purchaseCost)) return false;
    targetBuildings.push(
      createBuilding(buildingIndex, getBackgroundUrls().length, {
        purchaseCost,
      }),
    );
    setupBuilding(buildingIndex, targetBuildings);
    if (targetBuildings === buildings) persist();
    return true;
  }

  // a map marker's long-press: a renovation that prepays the whole wallet, buys
  // the building's most expensive affordable item until none is left, and
  // refunds the rest on commit
  function buyOutBuilding(buildingIndex: number): Promise<boolean> {
    const floors = buildings[buildingIndex];
    if (!floors || !cheapestPurchase(buildings, buildingIndex))
      return Promise.resolve(false);
    const budget = structuredClone(getTotalIncome());
    return startBuildingRenovation(
      floors,
      createFixedRenovationPlan(floors, budget, 1),
      "buyAll",
    ).then((bought) => {
      if (bought) saveCurrentCompanyStateSoon();
      return bought;
    });
  }

  interface AutoPurchase {
    cost: BigNumber;
    label: string;
    // spends and applies via the same canonical purchase the menus use;
    // false when it turned out to be unaffordable
    buy: () => boolean;
  }

  // scans every purchasable thing in the company (or just one building, when
  // onlyBuildingIndex is given) and returns the most expensive affordable one,
  // or null once nothing can currently be bought
  function cheapestPurchase(
    targetBuildings = buildings,
    onlyBuildingIndex?: number,
  ): AutoPurchase | null {
    let best: AutoPurchase | null = null;
    const consider = (candidate: AutoPurchase): void => {
      if (
        !gte(getTotalIncome(), candidate.cost) ||
        (best !== null && !gt(candidate.cost, best.cost))
      ) {
        return;
      }
      best = candidate;
    };
    if (onlyBuildingIndex === undefined) {
      consider({
        cost: getBuildingPrice(targetBuildings.length),
        label: "+1 building",
        buy: () => {
          const buildingIndex = targetBuildings.length;
          if (!buyBuilding(targetBuildings)) return false;
          const result = rollFloorBuyCrit(false);
          if (result)
            setBuildingCritTier(buildingIndex, result, targetBuildings);
          return true;
        },
      });
    }
    targetBuildings.forEach((floors, buildingIndex) => {
      if (
        onlyBuildingIndex !== undefined &&
        buildingIndex !== onlyBuildingIndex
      )
        return;
      const top = floors[floors.length - 1];
      if (top && !top.unlocked) {
        consider({
          cost: top.unlockCost,
          label: "+1 floor",
          buy: () =>
            performAutomatedFloorUnlock(
              floorActionDeps(buildingIndex, targetBuildings),
              top,
            ),
        });
      }
      for (const floor of floors) {
        if (!floor.unlocked) continue;
        const armed = getCritTier(floor) !== null;
        const upgradeCost = getUpgradeCost(floor);
        // a broken $0 price would otherwise be bought forever
        if (!isFloorMaxed(floor) && (armed || !isZero(upgradeCost)))
          consider({
            cost: armed ? ZERO : upgradeCost,
            label: "+1 upgrade",
            buy: () =>
              performAutomatedUpgradeClick(
                floorActionDeps(buildingIndex, targetBuildings),
                floor,
                floors[0] === floor,
              ),
          });
        if (floor.workerCount < MAX_RENDERED_WORKERS) {
          consider({
            cost: getWorkerCost(floor),
            label: "+1 worker",
            buy: () => buyWorker(floor),
          });
        }
        if (!floor.hasOfficeChairs) {
          consider({
            cost: getOfficeChairsCost(floor),
            label: "+1 chairs",
            buy: () => buyOfficeChairs(floor),
          });
        }
        if (!floor.hasOfficeSupplies) {
          consider({
            cost: getOfficeSuppliesCost(floor),
            label: "+1 supplies",
            buy: () => buyOfficeSupplies(floor),
          });
        }
        if (!floor.hasManager && isManagerUnlocked(floor)) {
          consider({
            cost: getManagerCost(floor),
            label: "+1 manager",
            buy: () => buyManager(floor),
          });
        }
      }
    });
    return best;
  }

  // sets EVERY floor a building currently has (locked or not) to the given crit
  // tier, permanently — no unlocking, no cost (see cityMap/index.ts's map-buy
  // crit celebration). A brand new building only has its one free ground floor
  // + the one locked floor already queued above it at this point; any floor
  // added later inherits this same tier automatically (see floorLock.ts's
  // ensureLockedFloorAbove). `chain` (see rollFloorBuyCrit's own chain flag)
  // additionally UNLOCKS that already-queued locked floor (it already got the
  // tier from the loop below, but was still sitting locked) and keeps climbing
  // further above it — same "chain crit" behavior the other 2 crit events
  // share. Chain must start from index 0 (the ground floor), NOT
  // floors.length-1 — the walker's first step lands on startIndex+1, and the
  // queued locked floor is always index 1 at this point (a brand new building
  // is always exactly [ground, one queued locked floor] here), so starting
  // any later just skips over it and the chain never actually unlocks anything
  function applyBuildingCritTier(
    buildingIndex: number,
    result: CritRollResult,
    targetBuildings = buildings,
  ): void {
    const floors = targetBuildings[buildingIndex];
    if (!floors) return;
    const { tier, chain } = result;
    for (const floor of floors) {
      if (!result.skip) floor.critMultiplierTier = tier;
    }
    if (result.mystic) createMysticBuilding(targetBuildings);
    // reward side of every proc this building-buy event actually supports —
    // one handler per proc kind (see shared/critTypes's applyCritProcs), so
    // this is the ONE place that has to say what "upgrade"/"heavenly" mean
    // for a whole building; a proc with no entry here (boost/bounce/
    // explosion/booty/peppermint don't apply at building scope) is simply
    // skipped
    applyCritProcs(result, floors, {
      // upgrade crit: promotes every floor this building has one further
      // step past the tier they were just set to above (see
      // rollFloorBuyCrit's own upgrade flag, applied here instead of
      // floorInteractions.ts since this is a whole-building event, not a
      // single Floor)
      upgrade: (floors) => {
        for (const floor of floors) {
          floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
        }
      },
      // heavenly crit: the biggest reward of all, applied building-wide —
      // unlocks every remaining floor for free, maxes every floor's tier,
      // then grants each one a full max-tier free-upgrade batch. Uses
      // increaseIncomeRate directly (not floorInteractions.ts's
      // applyUpgradeTick, which also spawns a coin burst/re-rolls a crit at
      // a specific ON-SCREEN floor button position) since this building may
      // not even be the one currently displayed
      heavenly: (floors) => {
        unlockAllFloors({
          floors,
          backgroundCount: getBackgroundUrls().length,
          multiplier: getBuildingMultiplier(buildingIndex),
          onAdd: (floor) => {
            if (
              targetBuildings === buildings &&
              buildingIndex === activeBuildingIndex
            ) {
              gameCanvas.notifyFloorAdded(floor);
            }
          },
        });
        const maxTier = CRIT_TIER_ORDER[0];
        const count = CRIT_TIER_CONFIG[maxTier].multiplier;
        for (const floor of floors) {
          floor.critMultiplierTier = maxTier;
          for (let i = 0; i < count; i++) {
            increaseIncomeRate(floor);
          }
        }
      },
      // skip crit: unlocks every floor and grants its free workers, manager,
      // office chairs, and supplies without changing tiers or levels
      skip: (floors) => {
        unlockAllFloors({
          floors,
          backgroundCount: getBackgroundUrls().length,
          multiplier: getBuildingMultiplier(buildingIndex),
          onAdd: (floor) => {
            if (
              targetBuildings === buildings &&
              buildingIndex === activeBuildingIndex
            ) {
              gameCanvas.notifyFloorAdded(floor);
            }
          },
        });
        for (const floor of floors) {
          if (!floor.unlocked) continue;
          floor.workerCount = MAX_RENDERED_WORKERS;
          floor.hasManager = true;
          floor.hasOfficeChairs = true;
          floor.hasOfficeSupplies = true;
        }
      },
      // grand opening crit: same reward as at floor scope — unlocks every
      // remaining locked floor of this building for free
      grandOpening: (floors) => {
        unlockAllFloors({
          floors,
          backgroundCount: getBackgroundUrls().length,
          multiplier: getBuildingMultiplier(buildingIndex),
          onAdd: (floor) => {
            if (
              targetBuildings === buildings &&
              buildingIndex === activeBuildingIndex
            ) {
              gameCanvas.notifyFloorAdded(floor);
            }
          },
        });
      },
      luckyClover: (floors) => {
        const count = CRIT_TIER_CONFIG[LUCKY_CLOVER_CRIT_TIER].multiplier;
        for (const floor of floors) {
          if (!floor.unlocked) continue;
          for (let run = 0; run < LUCKY_CLOVER_CRIT_COUNT; run++) {
            for (let i = 0; i < count; i++) increaseIncomeRate(floor);
          }
        }
      },
    });
    if (!chain) return;
    applyChainCrit(
      {
        floors,
        backgroundCount: getBackgroundUrls().length,
        multiplier: getBuildingMultiplier(buildingIndex),
        onFloorAdded: (floor) => {
          if (
            targetBuildings === buildings &&
            buildingIndex === activeBuildingIndex
          ) {
            gameCanvas.notifyFloorAdded(floor);
          }
        },
      },
      0,
      (floor) => {
        floor.critMultiplierTier = tier;
      },
    );
  }
  // a chain crit ALWAYS has at least +1 impact area — same guarantee
  // applyChainCrit's own floor walker already gives (its first extra floor is
  // unconditional, only whether it keeps going past that is a coin flip).
  // "The building" being unlocked for THIS event is a whole building, not a
  // floor, so a chain here must always unlock at least one MORE building
  // (free, same tier, its own floor-chain too) — only whether it climbs PAST
  // that first extra building is CHAIN_CRIT_CONTINUE_CHANCE
  function setBuildingCritTier(
    buildingIndex: number,
    result: CritRollResult,
    targetBuildings = buildings,
  ): void {
    applyBuildingCritTier(buildingIndex, result, targetBuildings);
    if (result.chain) {
      let continueChain = true;
      while (continueChain) {
        const nextIndex = targetBuildings.length;
        targetBuildings.push(
          createBuilding(nextIndex, getBackgroundUrls().length),
        );
        setupBuilding(nextIndex, targetBuildings);
        applyBuildingCritTier(nextIndex, result, targetBuildings);
        continueChain = Math.random() < CHAIN_CRIT_CONTINUE_CHANCE;
      }
    }
    // pair/three of a kind/four of a kind/full house crits (see
    // shared/critTypes' POKER_HAND_CRIT_COUNTS): at floor scope these
    // promote a fixed number of floors; at this whole-building scope they
    // unlock/create that many buildings instead (the building this event is
    // already for counts as the first of them, so only count-1 MORE get
    // created here), each set to the same landed tier. Applied independently
    // per landed kind (MAX_SPECIAL_CRIT_PROCS allows up to 2 to land
    // together), same as every other proc's reward. Royal Flush is the ONE
    // exception at floor scope (unlocks/upgrades every floor above it
    // instead of a fixed 6 — see floorInteractions.ts's applyPokerHandCrit
    // call), but at this map/building scope it still just unlocks 6
    // buildings, same as every other poker-hand crit here
    for (const count of [
      result.pair && POKER_HAND_CRIT_COUNTS.pair,
      result.threeOfAKind && POKER_HAND_CRIT_COUNTS.threeOfAKind,
      result.fourOfAKind && POKER_HAND_CRIT_COUNTS.fourOfAKind,
      result.fullHouse && POKER_HAND_CRIT_COUNTS.fullHouse,
      result.royalFlush && POKER_HAND_CRIT_COUNTS.royalFlush,
    ]) {
      if (!count) continue;
      for (let i = 1; i < count; i++) {
        const nextIndex = targetBuildings.length;
        targetBuildings.push(
          createBuilding(nextIndex, getBackgroundUrls().length),
        );
        setupBuilding(nextIndex, targetBuildings);
        applyBuildingCritTier(nextIndex, result, targetBuildings);
      }
    }
    if (targetBuildings === buildings) persist();
  }

  // the old building-picker popup is kept wired (backdrop/list still functional)
  // but nothing opens it anymore — it's replaced by tapping the map's own cat
  // markers (see createCityMapView below)
  wireMapMenu(
    app,
    () => buildings.length,
    () => activeBuildingIndex,
    buyBuilding,
    goToBuilding,
    buildings,
  );
  // toggles between the building canvas and the static city map canvas
  function closeMapView(): void {
    mapOpen = false;
    canvas.hidden = false;
    cityMapEl.hidden = true;
    playSwoosh();
    // both hidden canvases' ResizeObserver callbacks fire async, too late to save
    // the very next redraw()/tick from dividing by a stale zero size
    gameCanvas.resize();
    gameCanvas.redraw();
    refreshRenovationView();
  }
  function openMapView(): void {
    mapOpen = true;
    canvas.hidden = true;
    cityMapEl.hidden = false;
    playSwoosh();
    cityMapView.refresh();
    refreshRenovationView();
  }
  const cityMapView = createCityMapView(app, {
    getTotalIncome,
    getBuildingCount: () => buildings.length,
    getActiveBuildingIndex: () => activeBuildingIndex,
    getBuildingFloorCount: (buildingIndex) =>
      // buildings[i] always includes one extra locked floor waiting above the
      // topmost unlocked one (see ensureLockedFloorAbove) — the marker should
      // only count floors actually unlocked, not that placeholder
      buildings[buildingIndex]?.filter((floor) => floor.unlocked).length ?? 0,
    isBuildingFullyManaged: (buildingIndex) => {
      const floors = buildings[buildingIndex];
      if (!floors) return false;
      const unlockedFloors = floors.filter((floor) => floor.unlocked);
      return (
        unlockedFloors.length >= MAX_FLOORS_PER_BUILDING &&
        unlockedFloors.every((floor) => floor.hasManager)
      );
    },
    getBuildingCritTier: (buildingIndex) =>
      getUniformCritTier(buildings[buildingIndex] ?? []),
    isBuildingRenovating: (buildingIndex) =>
      renovations.isRunning(activeCompanyIndex, buildingIndex),
    buyBuilding,
    onStateChanged: saveCurrentCompanyStateNow,
    buyOutBuilding,
    setBuildingCritTier,
    onSelectBuilding: (index) => {
      goToBuilding(index);
      closeMapView();
    },
    onSwitchCompany: (companyIndex) => {
      const skip = skipNextOutgoingSnapshot;
      skipNextOutgoingSnapshot = false;
      switchToCompany(companyIndex, skip);
    },
    onOpenCorporationStats: () => corporationStats.open(),
  });
  wireActionBar(app, {
    onScrollTop: () => {
      playSwoosh();
      if (mapOpen) cityMapView.flashVerticalRays(-1);
      else gameCanvas.scrollActiveToTop();
    },
    onScrollBottom: () => {
      playSwoosh();
      if (mapOpen) cityMapView.flashVerticalRays(1);
      else gameCanvas.scrollActiveToBottom();
    },
    onHoldScrollTop: () => {
      if (!mapOpen) return;
      playSwoosh();
      cityMapView.jumpToEnd(-1);
    },
    onHoldScrollBottom: () => {
      if (!mapOpen) return;
      playSwoosh();
      cityMapView.jumpToEnd(1);
    },
    onBoostAll: () => {
      if (
        isDetachedJobPending() ||
        (!mapOpen && buildings[activeBuildingIndex].some(isFloorLocked))
      )
        return;
      if (mapOpen) badgeCollection.open();
      else boostMenu.open();
    },
    onOpenUpgradeMenu: () => {
      if (
        isDetachedJobPending() ||
        (!mapOpen && buildings[activeBuildingIndex].some(isFloorLocked))
      )
        return;
      if (mapOpen) corporationUpgradeMenu.open();
      else upgradeMenu.open();
    },
    onOpenMapMenu: () => {
      if (mapOpen) closeMapView();
      else openMapView();
    },
  });

  buildings.forEach((_, i) => setupBuilding(i));
  persist();

  rebalanceDormantCompanyEconomies(getGlobalIncomeBoostMultiplier);
  const idleIncome = computeIdleIncome(
    buildings,
    currentIncomeRatePerSecond,
    getGlobalIncomeBoostMultiplier(),
  );
  const lastClose = getLastCloseTimestamp();
  const now = Date.now();
  const dormantIdleIncome =
    lastClose !== null && (now - lastClose) / 1000 > IDLE_INCOME_MIN_SECONDS
      ? getDormantCompaniesIdleIncome(lastClose, now)
      : fromNumber(0);
  const totalIdleIncome = add(idleIncome, dormantIdleIncome);
  // saveBuildings directly (not the debounced persist()): computeIdleIncome advances
  // every floor's lastCollectedAt in memory, and that must land before a second quick
  // reload could otherwise re-collect the same already-paid-out idle time
  saveBuildings(buildings, activeCompanyIndex);
  if (gt(totalIdleIncome, fromNumber(0))) {
    addTotalIncome(idleIncome);
    void whenDocumentReady()
      .then(() => totalEarnedOverlay.show(totalIdleIncome))
      .then(markStartupSettled);
  } else {
    setTimeout(markStartupSettled, 0);
  }

  gameCanvas.redraw();

  // one continuous redraw loop drives every animation (workers, clouds, income bars,
  // coin bursts) — gameCanvas.ts itself only ever draws whichever buildings/floors are
  // actually scrolled into view, so this stays cheap no matter how many buildings exist.
  // Skipped while the map view is open: the building canvas is hidden (0x0) then, and
  // its own redraw() math (division by its own now-zero CSS size) would throw
  // Frozen behind any dialog (open or sliding): the dialog gets the main thread
  startIncomeTicker(() => {
    // the frame drawn above stays under the startup overlay until its intro ends
    if (mapOpen || !isStartupSettled()) return;
    if (isDialogOpen() || isDialogSliding()) return;
    gameCanvas.redraw();
  });
  startTotalIncomeTicker(buildings, getGlobalIncomeBoostMultiplier);

  bindSaveLifecycle({
    isIntact: isStorageIntact,
    markClosed: markAppClosed,
    saveNow: () => {
      stopRenovationsNow();
      saveCurrentCompanyStateNow();
    },
  });
}

main();

// registers the offline/installable-app shell (public/sw.js) — gated on
// !import.meta.hot rather than MODE, since "npm run dev:prod" (MODE=production)
// is STILL vite's dev server with HMR, not a real build; import.meta.hot only
// exists under any Vite dev server (regardless of --mode), so this is the one
// check that's actually true exclusively for genuinely built/served dist output.
// BASE_URL already carries the "/kitty-inc/" GitHub Pages prefix (see
// vite.config.ts), so this resolves correctly once deployed
if ("serviceWorker" in navigator && !import.meta.hot) {
  afterStartup(() => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.error("Service worker registration failed", err));
  });
}
