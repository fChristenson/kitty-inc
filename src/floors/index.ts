export { getCritTier, getUpgradeCost, getButtonCenter } from "./upgradeButton";
import { randomInt } from "../utils";
import type { Floor } from "../gameState";
import type { CritTier } from "./upgradeButton";
import {
  loadBackgrounds,
  loadGroundImage as loadAssetGroundImage,
} from "../loadAssets";
import { baseFloorInterval, floorIncomeScale } from "../shared/upgradeEconomy";
import {
  type BigNumber,
  fromNumber,
  pow,
  multiply,
  multiplyBig,
  ZERO,
} from "../shared/bigNumber";
import { CONFIG } from "../config";
import {
  FLOOR_W,
  FLOOR_H,
  FLOOR_X_MIN,
  FLOOR_X_MAX,
  GROUND_H,
  GROUND_TILE_W,
  DIVIDER_H,
  ROOM_CONTENT_SCALE,
  ROOM_CONTENT_SCALE_X,
  ROOM_CONTENT_Y_OFFSET,
  ROOM_WALL_OVERLAP_PX,
  SIDE_WALL_WIDTH,
  TOP_WALL_WIDTH,
} from "./constants";

export {
  FLOOR_W,
  FLOOR_H,
  FLOOR_X_MIN,
  FLOOR_X_MAX,
  GROUND_H,
  DIVIDER_H,
  ROOM_CONTENT_SCALE,
  SIDE_WALL_WIDTH,
  TOP_WALL_WIDTH,
};

// every literal balance number below lives in src/config.ts (CONFIG.floors) —
// tune income/pricing there, not here
const BASE_INCOME_AMOUNT = CONFIG.floors.baseIncomeAmount; // ground floor's starting $/interval
// each floor above starts at incomeGrowthFactor times the previous floor's income
// amount, while the interval only doubles (see BASE_INCOME_INTERVAL_SECONDS) —
// incomeGrowthFactor is kept equal to that doubling (see config.ts's own comment
// on why), so a fresh, un-upgraded floor's $/s is flat across floor depth; only
// upgrades (and other buildings) grow it from there
const BASE_UPGRADE_COST = CONFIG.floors.baseUpgradeCost; // ground floor's starting upgrade price; each floor above doubles it
const BASE_UNLOCK_COST = CONFIG.floors.baseUnlockCost; // floor 2's unlock price; each floor above doubles it
const UNLOCK_COST_GROWTH_FACTOR = CONFIG.floors.unlockCostGrowthFactor;
// each upgrade click's payoff scales exactly like the base income (same
// INCOME_GROWTH_FACTOR), so a higher floor's own upgrades are still worth
// proportionately more per click than a lower floor's — a flat step here would
// let enough flat-rate floor-1 upgrades out-earn a higher, unupgraded floor
const BASE_RATE_STEP = CONFIG.floors.baseRateStep;

// every processed floor background (see scripts/process-background-floors.mjs,
// which writes into dist/backgrounds/ — see ../loadAssets)
// background/gameCanvas reads this fresh every redraw via getActiveBackgrounds
let activeBackgrounds: HTMLImageElement[] = [];

// loads (or reuses, once already loaded) the floor backgrounds and makes it the
// active set every other floors/ function (and gameCanvas, via getActiveBackgrounds)
// reads from
export async function loadFloorBackgrounds(): Promise<HTMLImageElement[]> {
  if (activeBackgrounds.length > 0) return activeBackgrounds;
  activeBackgrounds = await loadBackgrounds();
  return activeBackgrounds;
}

// the currently-active building's own loaded background set — never empty once
// loadFloorBackgrounds has resolved at least once
export function getActiveBackgrounds(): HTMLImageElement[] {
  return activeBackgrounds;
}

// picks a background index in [0, count) for a floor being added on top of usedHistory
// (this building's existing floors' bgIndex values, oldest to newest). Prefers a
// background that hasn't appeared anywhere in usedHistory yet, picked randomly among
// whichever qualify; once every background has been used at least once, falls back to
// randomly picking between the two that were used longest ago (least recently used),
// excluding the immediately-previous floor's background whenever a different option
// exists — so a building never repeats a background back-to-back, and only starts
// repeating anything at all once its whole background pool has been shown at least once
export function pickBackgroundIndex(
  count: number,
  usedHistory: number[],
): number {
  if (count <= 1) return 0;
  const previous = usedHistory[usedHistory.length - 1] ?? null;
  const used = new Set(usedHistory);

  const unused: number[] = [];
  for (let i = 0; i < count; i++) if (!used.has(i)) unused.push(i);
  if (unused.length > 0) return unused[randomInt(0, unused.length - 1)];

  const lastSeenAt = new Map<number, number>();
  usedHistory.forEach((bg, position) => lastSeenAt.set(bg, position));
  const byStaleness = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => (lastSeenAt.get(a) ?? -1) - (lastSeenAt.get(b) ?? -1),
  );
  const candidates = byStaleness.slice(0, 2);
  const withoutPrevious = candidates.filter((i) => i !== previous);
  const pool = withoutPrevious.length > 0 ? withoutPrevious : candidates;
  return pool[randomInt(0, pool.length - 1)];
}

// floorLevel is 1-indexed (1 = ground floor), matching the number shown by floorNumber.ts.
// backgroundCount/existingBgIndexes pick which of the loaded backgrounds this floor gets
// (see pickBackgroundIndex above); multiplier scales every $ base value
// (buildings/index.ts's 1000x-per-building economy); groundFloorLocked forces floor 1
// to start locked/priced instead of the usual free ground floor — used for every
// building after the first one (buildings/index.ts spawns those locked)
export interface BuildFloorOptions {
  backgroundCount: number;
  existingBgIndexes?: number[];
  multiplier?: number;
  groundFloorLocked?: boolean;
  // a building-wide crit (see cityMap/index.ts) sets every floor to the same
  // tier — a freshly created floor starts as this tier too instead of null
  // (see floorLock.ts's ensureLockedFloorAbove, the only real caller of this)
  defaultCritTier?: CritTier | null;
  // this building's own accumulated seasonal-sale discount (see shared/critTypes'
  // SEASONAL_SALE_DISCOUNT_MULTIPLIER) — a freshly created floor starts already
  // discounted by this same amount instead of resetting to 1, so a locked floor
  // queued AFTER a seasonal sale already procced still gets it (see
  // floorLock.ts's ensureLockedFloorAbove, the only real caller of this)
  priceDiscountMultiplier?: number;
  startingUpgradeCost?: BigNumber;
  floorUnlockBaseCost?: BigNumber;
}

// the level-0 (freshly-built, un-upgraded) income/cost/interval stats for a given
// floorLevel/multiplier — buildFloor's own formula, factored out so a future
// caller needing the same level-0 baseline can reuse it instead of redriving it
// (see floorInteractions.ts's Spring Cleaning crit, which resets a floor to it)
export function computeBaseFloorStats(
  floorLevel: number,
  multiplier: number,
): {
  incomeAmount: BigNumber;
  incomeIntervalSeconds: number;
  upgradeCost: BigNumber;
  rateStep: BigNumber;
} {
  const incomeScale = floorIncomeScale(floorLevel);
  return {
    incomeAmount: fromNumber(incomeScale * BASE_INCOME_AMOUNT * multiplier),
    incomeIntervalSeconds: baseFloorInterval(floorLevel),
    upgradeCost: fromNumber(BASE_UPGRADE_COST * multiplier),
    rateStep: fromNumber(incomeScale * BASE_RATE_STEP * multiplier),
  };
}

export function buildFloor(
  floorLevel: number,
  options: BuildFloorOptions,
): Floor {
  const {
    backgroundCount,
    existingBgIndexes = [],
    multiplier = 1,
    groundFloorLocked = false,
    defaultCritTier = null,
    priceDiscountMultiplier = 1,
    startingUpgradeCost,
    floorUnlockBaseCost = fromNumber(BASE_UNLOCK_COST * multiplier),
  } = options;
  const isGroundFloor = floorLevel === 1;
  // BigNumber pow/multiply never overflow to Infinity no matter how high
  // floorLevel climbs (unlike plain `2 ** n`) — see shared/bigNumber
  const baseUnlockCost = isGroundFloor
    ? groundFloorLocked
      ? floorUnlockBaseCost
      : ZERO
    : multiplyBig(
        pow(UNLOCK_COST_GROWTH_FACTOR, floorLevel - 2),
        floorUnlockBaseCost,
      );
  const unlockCost = multiply(baseUnlockCost, priceDiscountMultiplier);
  // true once this level's own natural (uncapped) interval already exceeds the
  // 1h cap below — set once, forever, regardless of how far upgrades later
  // shrink the floor's actual incomeIntervalSeconds (see incomePanel.ts's
  // increaseIncomeRate, which charges these floors a steeper per-upgrade cost)
  const aboveCapTier =
    CONFIG.floors.baseIncomeIntervalSeconds * 2 ** (floorLevel - 1) >
    CONFIG.incomePanel.maxIncomeIntervalSeconds;

  const baseStats = computeBaseFloorStats(floorLevel, multiplier);
  return {
    bgIndex: pickBackgroundIndex(backgroundCount, existingBgIndexes),
    ...baseStats,
    upgradeCost: startingUpgradeCost ?? baseStats.upgradeCost,
    upgradeCount: 0,
    unlocked: isGroundFloor && !groundFloorLocked,
    unlockCost,
    workerCount: 1,
    lastCollectedAt: Date.now(),
    hasOfficeChairs: false,
    hasOfficeSupplies: false,
    hasManager: false,
    critMultiplierTier: defaultCritTier,
    aboveCapTier,
    overtimeTicks: 0,
    overtimeStartedAt: null,
    overtimeEndedAt: null,
    overtimeCost: ZERO,
    priceDiscountMultiplier,
  };
}

// draws one floor slab (just its background art now — furniture is baked into bg.png);
// ctx must already be translated so this floor's own top-left is at (0, 0). Crops
// ROOM_CONTENT_SHIFT_UP px off the image's own top edge and draws the rest 1:1 from
// (0,0) — i.e. the whole room shifted up by that amount, no scaling — so the room's
// own floor-line content isn't hidden behind the taller divider band drawn below it.
// Leaves the bottom ROOM_CONTENT_SHIFT_UP px of this floor undrawn (no clip needed:
// the divider band that's drawn right after this always covers exactly that gap).
export function drawFloor(
  ctx: CanvasRenderingContext2D,
  bgImage: HTMLImageElement,
  floor: Floor,
): void {
  // draws the FULL image, vertically compressed to fit above the divider band, so
  // no part of the art (including ceiling detail) is ever cropped off. Horizontally
  // compressed too, so the art spans wall-to-wall with only ROOM_WALL_OVERLAP_PX
  // reaching behind each side wall/top wall/divider band (drawOuterWall draws on top
  // of this and hides that sliver) instead of the walls masking a big strip of
  // full-width/full-height art
  ctx.drawImage(
    bgImage,
    0,
    0,
    FLOOR_W,
    FLOOR_H,
    SIDE_WALL_WIDTH - ROOM_WALL_OVERLAP_PX,
    ROOM_CONTENT_Y_OFFSET,
    FLOOR_W * ROOM_CONTENT_SCALE_X,
    FLOOR_H * ROOM_CONTENT_SCALE,
  );
  void floor; // no per-floor furniture placement left to draw; kept for a stable draw signature
}

let groundImage: HTMLImageElement | null = null;

// loads (or reuses, once already loaded) the ground/street art and makes it the
// active one drawGround reads from
export async function loadGroundImage(): Promise<HTMLImageElement> {
  if (groundImage) return groundImage;
  groundImage = await loadAssetGroundImage();
  return groundImage!;
}

// decorative strip beneath the ground floor (road + sidewalks + streetlights); ctx
// must already be translated to this strip's own top-left. width spans the whole
// building slot (floor room art + both side gutters), not just the room's own
// FLOOR_W, so the ground reads as continuous street under the gutters' sky strips
// too — tiled at its own native size (GROUND_TILE_W x GROUND_H) since it isn't
// perfectly seamless edge-to-edge but reads fine repeating at this scale/distance.
// worldX0 is the world-x this call's local x=0 maps to, so the tile phase stays
// locked to world coordinates instead of resetting to a fresh tile boundary (and
// visibly "swimming") every time the visible/clipped region's own left edge shifts
// during scrolling
const GROUND_OVERLAP = 15; // world units drawn past both the top and bottom edge
export function drawGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  worldX0: number,
): void {
  if (!groundImage) return;
  const phase = ((worldX0 % GROUND_TILE_W) + GROUND_TILE_W) % GROUND_TILE_W;
  // drawn a touch taller than its own logical [0, GROUND_H] bounds — overlapping up
  // into the floor room's own bottom edge and down past the canvas's true bottom
  // edge — so a hairline gap from sub-pixel canvas scaling can never show the floor
  // background peeking through right at either seam
  for (let x = -phase; x < width; x += GROUND_TILE_W) {
    ctx.drawImage(
      groundImage,
      x,
      -GROUND_OVERLAP,
      GROUND_TILE_W,
      GROUND_H + GROUND_OVERLAP * 2,
    );
  }
}

// everything below is this module's own facade: floors/ has several nested sub-parts
// (worker, upgradeButton, floorLock, ...) that stay together for internal reuse, but
// anything outside src/floors must import them from here, never from a nested path
export {
  startIncomeTicker,
  collectDueIncome,
  peekDueIncome,
  currentIncomeRatePerSecond,
  currentPayoutAmount,
  drawIncomePanel,
  getIncomeBarCenter,
  increaseIncomeRate,
  increaseIncomeRateBy,
} from "./incomePanel";
export {
  ensureLockedFloorAbove,
  unlockFloor,
  drawFloorLock,
  MAX_FLOORS_PER_BUILDING,
  getBuildingUnlockAllCost,
  unlockAllFloors,
} from "./floorLock";
export {
  drawCoins,
  hasActiveCoins,
  spawnCoinBurst,
  spawnFreezeCoinBurst,
  loadCoinImage,
} from "./coins";
export {
  hitTestFloorHover,
  handleFloorClick,
  performAutomatedUpgradeClick,
  performAutomatedUpgradeAfterPayment,
  performAutomatedFloorUnlock,
  isUpgradeButtonEnabled,
  applyChainCrit,
  applyExplosionCrit,
} from "./floorInteractions";
export type { ChainCritDeps } from "./floorInteractions";
export type { FloorActionsDeps } from "./floorInteractions";
export { forceBoostEvent } from "./boostEvent";
export { forceUnionEvent } from "./unionEvent";
export { forceKickbackEvent } from "./kickbackEvent";
export { forceBurstEvent } from "./burstEvent";
export { forceSprayEvent } from "./sprayEvent";
export { forceFountainEvent } from "./fountainEvent";
export { forceRippleEvent } from "./rippleEvent";
export { forceWreckingBallEvent } from "./wreckingBallEvent";
export { forcePiledriverEvent } from "./piledriverEvent";
export { forceOrbitalStrikeEvent } from "./orbitalStrikeEvent";
export { forceFuseEvent } from "./fuseEvent";
export { forceSupernovaEvent } from "./supernovaEvent";
export { forceBowlingEvent } from "./bowlingEvent";
export { forceThunderclapEvent } from "./thunderclapEvent";
export { forceChainReactionEvent } from "./chainReactionEvent";
export { forceBullseyeEvent } from "./bullseyeEvent";
export { forcePopcornEvent } from "./popcornEvent";
export { forceNewtonsCradleEvent } from "./newtonsCradleEvent";
export { forceJuggleEvent } from "./juggleEvent";
export { forceBoomerangEvent } from "./boomerangEvent";
export { forceHeartbeatEvent } from "./heartbeatEvent";
export { forceClashEvent } from "./clashEvent";
export { forceAsteroidsEvent } from "./asteroidsEvent";
export { forceWhackAMoleEvent } from "./whackAMoleEvent";
export { forceDrumrollEvent } from "./drumrollEvent";
export { forceShellGameEvent } from "./shellGameEvent";
export { forceSeesawEvent } from "./seesawEvent";
export { forceScratchEvent } from "./scratchEvent";
export { forceTagEvent } from "./tagEvent";
export { forceBumpersEvent } from "./bumpersEvent";
export { forceCatcherEvent } from "./catcherEvent";
export { forceImplosionEvent } from "./implosionEvent";
export { forceAtomEvent } from "./atomEvent";
export { forceSpiralEvent } from "./spiralEvent";
export { forceLoopEvent } from "./loopEvent";
export { forceEternityEvent } from "./eternityEvent";
export { forceHelixEvent } from "./helixEvent";
export { forceYoYoEvent } from "./yoYoEvent";
export { forceRacetrackEvent } from "./racetrackEvent";
export { forceSwingEvent } from "./swingEvent";
export { forceKaleidoscopeEvent } from "./kaleidoscopeEvent";
export { forceZipperEvent } from "./zipperEvent";
export { forceScreensaverEvent } from "./screensaverEvent";
export { forceSprinklerEvent } from "./sprinklerEvent";
export { forceClockworkEvent } from "./clockworkEvent";
export { forceHoleInOneEvent } from "./holeInOneEvent";
export { forceLeapfrogEvent } from "./leapfrogEvent";
export { forceLineupEvent } from "./lineupEvent";
export { forceStampedeEvent } from "./stampedeEvent";
export { forceWormholeEvent } from "./wormholeEvent";
export { forceSplatEvent } from "./splatEvent";
export { forceRouletteEvent } from "./rouletteEvent";
export { forceFreeKickEvent } from "./freeKickEvent";
export { forceSlalomEvent } from "./slalomEvent";
export { forceLightningEvent } from "./lightningEvent";
export { forceFireHoseEvent } from "./fireHoseEvent";
export { forceConfluenceEvent } from "./confluenceEvent";
export { forceSloshEvent } from "./sloshEvent";
export { forceSiphonEvent } from "./siphonEvent";
export { forceCrossfireEvent } from "./crossfireEvent";
export { forceGravityWellEvent } from "./gravityWellEvent";
export { forceSplashdownEvent } from "./splashdownEvent";
export { forceGeysersEvent } from "./geysersEvent";
export { forceCashCannonEvent } from "./cashCannonEvent";
export { forceHooverEvent } from "./hooverEvent";
export { forceAirShowEvent } from "./airShowEvent";
export { forceLeakEvent } from "./leakEvent";
export { forceClimbEvent } from "./climbEvent";
export { forceKiteEvent } from "./kiteEvent";
export { forceRainbowEvent } from "./rainbowEvent";
export { forceBranchesEvent } from "./branchesEvent";
export { forceTugOfWarEvent } from "./tugOfWarEvent";
export { forceWaterwheelEvent } from "./waterwheelEvent";
export { forceBraidEvent } from "./braidEvent";
export { forceSkimEvent } from "./skimEvent";
export { forceLatticeEvent } from "./latticeEvent";
export { forceFireworksEvent } from "./fireworksEvent";
export { forceSlingshotEvent } from "./slingshotEvent";
export { forceMarqueeEvent } from "./marqueeEvent";
export { forceCropDusterEvent } from "./cropDusterEvent";
export { forceBolasEvent } from "./bolasEvent";
export { forceCountdownEvent } from "./countdownEvent";
export { forceSparklerEvent } from "./sparklerEvent";
export { forceSlinkyEvent } from "./slinkyEvent";
export { forcePipelineEvent } from "./pipelineEvent";
export { forcePrismEvent } from "./prismEvent";
export { forceTrampolineEvent } from "./trampolineEvent";
export { forceHummingbirdEvent } from "./hummingbirdEvent";
export { forceDiveBombEvent } from "./diveBombEvent";
export { forceSkiJumpEvent } from "./skiJumpEvent";
export { forceJetpackEvent } from "./jetpackEvent";
export { forceBassDropEvent } from "./bassDropEvent";
export { forceScannerEvent } from "./scannerEvent";
export { forceLaserGridEvent } from "./laserGridEvent";
export { forceEtchEvent } from "./etchEvent";
export { forceSearchlightsEvent } from "./searchlightsEvent";
export { forceTractorBeamEvent } from "./tractorBeamEvent";
export { forceBeamClashEvent } from "./beamClashEvent";
export { forceButterflyEvent } from "./butterflyEvent";
export { forceKelpEvent } from "./kelpEvent";
export { forcePendulumWaveEvent } from "./pendulumWaveEvent";
export { forceFormationEvent } from "./formationEvent";
export { forceOuroborosEvent } from "./ouroborosEvent";
export { forceBowstringEvent } from "./bowstringEvent";
export { forceSuperlaserEvent } from "./superlaserEvent";
export { forceIonStormEvent } from "./ionStormEvent";
export { forceGlitchEvent } from "./glitchEvent";
export { forceMagnifierEvent } from "./magnifierEvent";
export { forceWaterShowEvent } from "./waterShowEvent";
export { forceMercuryEvent } from "./mercuryEvent";
export { forceAlignmentEvent } from "./alignmentEvent";
export { forceDandelionEvent } from "./dandelionEvent";
export { forceBobberEvent } from "./bobberEvent";
export { forceFishingEvent } from "./fishingEvent";
export { forceScissorsEvent } from "./scissorsEvent";
export { forcePulseRifleEvent } from "./pulseRifleEvent";
export { forceSplitEvent } from "./splitEvent";
export { forcePixelateEvent } from "./pixelateEvent";
export { forceDamBurstEvent } from "./damBurstEvent";
export { forceSpiderwebEvent } from "./spiderwebEvent";
export { forceCurtainEvent } from "./curtainEvent";
export { forceJellyfishEvent } from "./jellyfishEvent";
export { forcePolarityEvent } from "./polarityEvent";
export { forceColliderEvent } from "./colliderEvent";
export { forceSheepdogEvent } from "./sheepdogEvent";
export { forceDragonEvent } from "./dragonEvent";
export { forceReflectorEvent } from "./reflectorEvent";
export { forceCookieCutterEvent } from "./cookieCutterEvent";
export { forceCinematicEvent } from "./cinematicEvent";
export { forceNegativeEvent } from "./negativeEvent";
export { forceChainLightningEvent } from "./chainLightningEvent";
export { forceLockOnEvent } from "./lockOnEvent";
export { forceStitchEvent } from "./stitchEvent";
export { forceStockpileEvent } from "./stockpileEvent";
export { forceSpotWeldEvent } from "./spotWeldEvent";
export { forceReelsEvent } from "./reelsEvent";
export { forceCashShowerEvent } from "./cashShowerEvent";
export { forceCatherineWheelEvent } from "./catherineWheelEvent";
export { forceMultiballEvent } from "./multiballEvent";
export { forceWhipEvent } from "./whipEvent";
export { forceBatteryEvent } from "./batteryEvent";
export { forceTeslaCoilEvent } from "./teslaCoilEvent";
export { forceJacobsLadderEvent } from "./jacobsLadderEvent";
export { forceComicBookEvent } from "./comicBookEvent";
export { forceAvalancheEvent } from "./avalancheEvent";
export { forceBeehiveEvent } from "./beehiveEvent";
export { forcePogoEvent } from "./pogoEvent";
export { forceLaserHarpEvent } from "./laserHarpEvent";
export { forceLichtenbergEvent } from "./lichtenbergEvent";
export { forceShatterEvent } from "./shatterEvent";
export { forceFunnelEvent } from "./funnelEvent";
export { forceGrappleEvent } from "./grappleEvent";
export { forceSurfEvent } from "./surfEvent";
export { forceLaserTagEvent } from "./laserTagEvent";
export { forceBallLightningEvent } from "./ballLightningEvent";
export { forceEventHorizonEvent } from "./eventHorizonEvent";
export { forceTileFlipEvent } from "./tileFlipEvent";
export { forceGusherEvent } from "./gusherEvent";
export { forcePinataEvent } from "./pinataEvent";
export { forceGiftWrapEvent } from "./giftWrapEvent";
export { forceTriangulateEvent } from "./triangulateEvent";
export { forceSparkOfLifeEvent } from "./sparkOfLifeEvent";
export { forceGlassRainEvent } from "./glassRainEvent";
export { forceFoldEvent } from "./foldEvent";
export { forceCocoonEvent } from "./cocoonEvent";
export { forceGravityAssistEvent } from "./gravityAssistEvent";
export { forceZipLineEvent } from "./zipLineEvent";
export { forceBreachEvent } from "./breachEvent";
export { forceStormSurgeEvent } from "./stormSurgeEvent";
export { forceSmashAndGrabEvent } from "./smashAndGrabEvent";
export { forceShrinkRayEvent } from "./shrinkRayEvent";
export { forceSandstormEvent } from "./sandstormEvent";
export { forceJuggernautEvent } from "./juggernautEvent";
export { forceFuelLineEvent } from "./fuelLineEvent";
export { forceCheckoutEvent } from "./checkoutEvent";
export { forceLightningRodEvent } from "./lightningRodEvent";
export { forceFlagEvent } from "./flagEvent";
export { forceSlashEvent } from "./slashEvent";
export { forceJackhammerEvent } from "./jackhammerEvent";
export { forcePummelEvent } from "./pummelEvent";
export { forceOverloadEvent } from "./overloadEvent";
export { forceGatlingEvent } from "./gatlingEvent";
export { forcePressEvent } from "./pressEvent";
export { forceDrillEvent } from "./drillEvent";
export { forceBurrowEvent } from "./burrowEvent";
export { forcePingPongEvent } from "./pingPongEvent";
export { forceSlamDunkEvent } from "./slamDunkEvent";
export { forceUppercutEvent } from "./uppercutEvent";
export { forceHeadHopEvent } from "./headHopEvent";
export { forcePaparazziEvent } from "./paparazziEvent";
export { forceMissileBarrageEvent } from "./missileBarrageEvent";
export { forceSonicBoomEvent } from "./sonicBoomEvent";
export { forceMitosisEvent } from "./mitosisEvent";
export { forcePlinkoEvent } from "./plinkoEvent";
export { forceHammerThrowEvent } from "./hammerThrowEvent";
export { forceSnakeEvent } from "./snakeEvent";
export { forceBreakoutEvent } from "./breakoutEvent";
export { forceLineClearEvent } from "./lineClearEvent";
export { forceBreakShotEvent } from "./breakShotEvent";
export { forceBulletHellEvent } from "./bulletHellEvent";
export { forceVortexEvent } from "./vortexEvent";
export { forceRicochetEvent } from "./ricochetEvent";
export { forceWaterfallEvent } from "./waterfallEvent";
export { forceConveyorEvent } from "./conveyorEvent";
export { forceFirefliesEvent } from "./firefliesEvent";
export { forcePaydayEvent } from "./paydayEvent";
export { forcePiggyBankEvent } from "./piggyBankEvent";
export { forceCoinTossEvent } from "./coinTossEvent";
export { forceHourglassEvent } from "./hourglassEvent";
export { forceRocketEvent } from "./rocketEvent";
export { forceRevealEvent } from "./revealEvent";
export { forceJackpotReelsEvent } from "./jackpotReelsEvent";
export { forceChainPayEvent } from "./chainPayEvent";
export { forceTwisterEvent } from "./twisterEvent";
export { forceDownpourEvent } from "./downpourEvent";
export { forceTrickleEvent } from "./trickleEvent";
export { forceMagnetEvent } from "./magnetEvent";
export { forceSpilloverEvent } from "./spilloverEvent";
export { forceConstellationEvent } from "./constellationEvent";
export { forceAscendEvent } from "./ascendEvent";
export { forceRisingTideEvent } from "./risingTideEvent";
export { forceTidalWaveEvent } from "./tidalWaveEvent";
export { forceBeanstalkEvent } from "./beanstalkEvent";
export { forceBlessingEvent } from "./blessingEvent";
export { forceHaloEvent } from "./haloEvent";
export { forceCometEvent } from "./cometEvent";
export { forceMeteorShowerEvent } from "./meteorShowerEvent";
export { forceMentorEvent } from "./mentorEvent";
export { forceSparkChainEvent } from "./sparkChainEvent";
export { forcePolishEvent } from "./polishEvent";
export { forceLighthouseEvent } from "./lighthouseEvent";
export { forceRecruitEvent } from "./recruitEvent";
export { forcePromotionDayEvent } from "./promotionDayEvent";
export { forceAlchemyEvent } from "./alchemyEvent";
export { forceInvestmentEvent } from "./investmentEvent";
export { forceDividendsEvent } from "./dividendsEvent";
export { forceWispEvent } from "./wispEvent";
export { forceStreamEvent } from "./streamEvent";
export { forceTrailsEvent } from "./trailsEvent";
export { forceDrawEvent } from "./drawEvent";
export { forceNightSkyEvent } from "./nightSkyEvent";
export { forcePitcherEvent } from "./pitcherEvent";
export { forceGlimmerEvent } from "./glimmerEvent";
export type { OnScreenFloor } from "./eventProcs";
export { forceHuntEvent } from "./huntEvent";
export { startSwarmEvent } from "./swarmEvent";
export { forceRenovateEvent } from "./renovateEvent";
export { forceUpgradeEvent } from "./upgradeEvent";
export { forceUnlockEvent } from "./unlockEvent";
export {
  forceKeynoteCritUpgrade,
  forceKeynoteFloorBuyCrit,
  forceFeaturedCritUpgrade,
  forceFeaturedFloorBuyCrit,
  forceTestCrit,
  forceSkipCritUpgrade,
  forceSkipFloorBuyCrit,
  forceRainCheckFloorBuyCrit,
} from "./upgradeButton";
export {
  drawWorker,
  getBoostedWorkerCenters,
  tickWorkerOffscreen,
  loadWorkerSprite,
  getWorkerIconUrl,
  getManagerIconUrl,
  triggerJumpAll,
  getRenderedWorkerCount,
  applyBoostAll,
  MAX_RENDERED_WORKERS,
  WALK_SPEED,
  WORKER_FEET_Y_NUDGE_PX,
} from "./worker";
export { drawUpgradeStar, getUpgradeIndicatorCenter } from "./star";
export { drawDiscoFloor } from "./disco";
export {
  drawUpgradeArrow,
  hitTestUpgradeArrow,
  getUpgradeArrowCenter,
} from "./upgradeArrow";
export {
  drawUpgradeButton,
  hitTestUpgradeButton,
  triggerButtonPress,
  startButtonHoldAnim,
  stopButtonHoldAnim,
  rollCritUpgrade,
  isCritUpgrade,
  forceCritUpgrade,
  forceMegaCritUpgrade,
  forceUltraCritUpgrade,
  forceChainCritUpgrade,
  forceDominoEffectCritUpgrade,
  forceBlueprintCritUpgrade,
  forceDominoEffectFloorBuyCrit,
  forceBlueprintFloorBuyCrit,
  forceFirstClassFloorBuyCrit,
  forceLuckyNumberFloorBuyCrit,
  forceOpenBookFloorBuyCrit,
  forceExecutiveBonusFloorBuyCrit,
  forcePowerSurgeFloorBuyCrit,
  forcePriceMatchFloorBuyCrit,
  forceBoostCritUpgrade,
  forceBounceCritUpgrade,
  forceExplosionCritUpgrade,
  forceBootyCritUpgrade,
  forceUpgradeCritUpgrade,
  forcePeppermintCritUpgrade,
  forceHeavenlyCritUpgrade,
  forceMysticCritUpgrade,
  forceMysticFloorBuyCrit,
  forcePairCritUpgrade,
  forceThreeOfAKindCritUpgrade,
  forceFourOfAKindCritUpgrade,
  forceFullHouseCritUpgrade,
  forceRoyalFlushCritUpgrade,
  forceTickTockCritUpgrade,
  forceChairGiveawayCritUpgrade,
  forceSuppliesGiveawayCritUpgrade,
  forceWinterSaleCritUpgrade,
  forceSpringSaleCritUpgrade,
  forceSummerSaleCritUpgrade,
  forceAutumnSaleCritUpgrade,
  forceHalloweenSaleCritUpgrade,
  forceEasterSaleCritUpgrade,
  forceSunshineCritUpgrade,
  forceSnowdayCritUpgrade,
  forceFastForwardCritUpgrade,
  forceFrozenCritUpgrade,
  forceSpendingFreezeCritUpgrade,
  forceSnowballCritUpgrade,
  forceFreeSaleCritUpgrade,
  forceBullMarketCritUpgrade,
  forcePaydayCritUpgrade,
  forceGoldStandardCritUpgrade,
  forceNightShiftCritUpgrade,
  forceInternCritUpgrade,
  forceTalentScoutCritUpgrade,
  forceUnionBossCritUpgrade,
  forceRushHourCritUpgrade,
  forceRateLockCritUpgrade,
  forceGoldenTicketCritUpgrade,
  forceSilverTicketCritUpgrade,
  forceGoldenParachuteCritUpgrade,
  forceRainCheckCritUpgrade,
  forceExecutiveBonusCritUpgrade,
  forcePowerSurgeCritUpgrade,
  forcePriceMatchCritUpgrade,
  forceFirstClassCritUpgrade,
  forceLuckyNumberCritUpgrade,
  forceOpenBookCritUpgrade,
  forceCashFlowCritUpgrade,
  forcePayoutCritUpgrade,
  forceGrandOpeningCritUpgrade,
  forceFullyStaffedCritUpgrade,
  forceShiftChangeCritUpgrade,
  forceEspressoShotCritUpgrade,
  forceDejaVuCritUpgrade,
  forceCloneArmyCritUpgrade,
  forceLuckyCloverCritUpgrade,
  forceSecondWindCritUpgrade,
  forceExecutiveOrderCritUpgrade,
  forceRoundUpCritUpgrade,
  forceSafetyNetCritUpgrade,
  forceFloorShareCritUpgrade,
  forceSameBoatCritUpgrade,
  forceGoldenHandshakeCritUpgrade,
  forceSupplyRunCritUpgrade,
  forceCasualFridayCritUpgrade,
  forceFancyFridayCritUpgrade,
  forceFireDrillCritUpgrade,
  forceBonusRoundCritUpgrade,
  forceOverflowCritUpgrade,
  forcePerformanceBonusCritUpgrade,
  forceDoubleDownCritUpgrade,
  forceCoffeeRunCritUpgrade,
  forceDressCodeCritUpgrade,
  forceTeaBreakCritUpgrade,
  forceTeamBuildingCritUpgrade,
  forceTeamLunchCritUpgrade,
  forceSpringCleaningCritUpgrade,
  forceNightOwlCritUpgrade,
  forceHeadhunterCritUpgrade,
  forceRecruitmentDriveCritUpgrade,
  forceMergerCritUpgrade,
  forceShareholdersCritUpgrade,
  forceBonusTierCritUpgrade,
  forceFloorBuyCrit,
  forceGrandOpeningFloorBuyCrit,
  forceFullyStaffedFloorBuyCrit,
  forceShiftChangeFloorBuyCrit,
  forceEspressoShotFloorBuyCrit,
  forceDejaVuFloorBuyCrit,
  forceCloneArmyFloorBuyCrit,
  forceLuckyCloverFloorBuyCrit,
  forceSecondWindFloorBuyCrit,
  forceExecutiveOrderFloorBuyCrit,
  forceRoundUpFloorBuyCrit,
  forceGoldenHandshakeFloorBuyCrit,
  forceSupplyRunFloorBuyCrit,
  forceCasualFridayFloorBuyCrit,
  forceFancyFridayFloorBuyCrit,
  forceFireDrillFloorBuyCrit,
  forceBonusRoundFloorBuyCrit,
  forceOverflowFloorBuyCrit,
  forcePerformanceBonusFloorBuyCrit,
  forceDoubleDownFloorBuyCrit,
  forceCoffeeRunFloorBuyCrit,
  forceDressCodeFloorBuyCrit,
  forceTeaBreakFloorBuyCrit,
  forceTeamBuildingFloorBuyCrit,
  forceTeamLunchFloorBuyCrit,
  forceSpringCleaningFloorBuyCrit,
  forceNightOwlFloorBuyCrit,
  forceHeadhunterFloorBuyCrit,
  forceRecruitmentDriveFloorBuyCrit,
  forcePayoutFloorBuyCrit,
  rollFloorBuyCrit,
  pickHigherCritTier,
  getUniformCritTier,
  triggerSaleBoost,
  isSaleActive,
  floorIncomePerSecond,
  triggerOvertimeBoost,
  isOvertimeActive,
  CRIT_TIER_CONFIG,
  CHAIN_CRIT_CONTINUE_CHANCE,
} from "./upgradeButton";
export type { CritTier } from "./upgradeButton";
export {
  spawnFloatingCoins,
  drawFloatingCoins,
  loadFloatingCoinImage,
} from "./coinFloat";
export { spawnIncomeFloatText, drawIncomeFloatText } from "./incomeFloatText";
